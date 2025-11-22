package main

import (
	"context"
	"database/sql"
	"database/sql/driver"
	_ "embed"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/apache/arrow-go/v18/arrow"
	"github.com/apache/arrow-go/v18/arrow/array"
	"github.com/apache/iceberg-go/catalog"
	_ "github.com/apache/iceberg-go/catalog/glue"
	"github.com/apache/iceberg-go/table"
	"github.com/aws/aws-lambda-go/lambda"
	duckdb "github.com/duckdb/duckdb-go/v2"
)

//go:embed query.sql
var querySQL string

var db *sql.DB

type Event struct {
	TargetDate string `json:"target_date"`
}

type Response struct {
	StatusCode    int    `json:"statusCode"`
	Message       string `json:"message"`
	RowsProcessed int    `json:"rows_processed"`
}

func init() {
	var err error
	if db, err = sql.Open("duckdb", ":memory:"); err != nil {
		log.Fatal(err)
	}
	for _, cmd := range []string{
		"SET home_directory='/tmp'",
		"INSTALL httpfs", "LOAD httpfs",
		"INSTALL aws", "LOAD aws",
		"CREATE OR REPLACE SECRET (TYPE s3, PROVIDER credential_chain)",
		"SET temp_directory = '/tmp/duckdb_swap'",
		"SET memory_limit = '3GB'",
		"SET max_temp_directory_size = '7GB'",
	} {
		if _, err := db.Exec(cmd); err != nil {
			log.Fatal(err)
		}
	}
}

func execDuckDB(ctx context.Context, execer driver.ExecerContext, cmds []string) error {
	for _, cmd := range cmds {
		if _, err := execer.ExecContext(ctx, cmd, nil); err != nil {
			return err
		}
	}
	return nil
}

func readDataFromS3(ctx context.Context, targetDate string) (arrow.Table, error) {
	sourcePath := fmt.Sprintf("s3://%s/%s/id=*/date=%s/*.csv",
		os.Getenv("SOURCE_BUCKET"), os.Getenv("SOURCE_PREFIX"), targetDate)

	connector, err := duckdb.NewConnector(":memory:", func(execer driver.ExecerContext) error {
		return execDuckDB(ctx, execer, []string{
			"SET home_directory='/tmp'",
			"INSTALL httpfs", "LOAD httpfs",
			"INSTALL aws", "LOAD aws",
			"CREATE OR REPLACE SECRET (TYPE s3, PROVIDER credential_chain)",
		})
	})
	if err != nil {
		return nil, err
	}
	defer connector.Close()

	conn, err := connector.Connect(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Close()

	arrowDB, err := duckdb.NewArrowFromConn(conn)
	if err != nil {
		return nil, err
	}

	query := strings.ReplaceAll(querySQL, "{{SOURCE_PATH}}", sourcePath)
	rdr, err := arrowDB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rdr.Release()

	records := []arrow.RecordBatch{}
	for rdr.Next() {
		rec := rdr.RecordBatch()
		rec.Retain()
		records = append(records, rec)
	}
	if err := rdr.Err(); err != nil {
		for _, rec := range records {
			rec.Release()
		}
		return nil, err
	}
	if len(records) == 0 {
		return nil, nil
	}

	tbl := array.NewTableFromRecords(rdr.Schema(), records)
	for _, rec := range records {
		rec.Release()
	}
	log.Printf("Read %d rows from %s", tbl.NumRows(), sourcePath)
	return tbl, nil
}

func writeToIceberg(ctx context.Context, arrowTable arrow.Table) error {
	region := os.Getenv("AWS_REGION")
	if region == "" {
		region = "ap-northeast-1"
	}

	cat, err := catalog.Load(ctx, "glue", map[string]string{
		"type":      "glue",
		"warehouse": fmt.Sprintf("s3://%s/iceberg/", os.Getenv("TARGET_BUCKET")),
		"region":    region,
	})
	if err != nil {
		return err
	}

	tbl, err := cat.LoadTable(ctx, table.Identifier{
		os.Getenv("GLUE_DATABASE"),
		os.Getenv("GLUE_TABLE"),
	})
	if err != nil {
		return err
	}

	if val, ok := tbl.Properties()["write.object-storage.enabled"]; ok {
		log.Printf("write.object-storage.enabled = %s", val)
	} else {
		log.Printf("write.object-storage.enabled = (not set)")
	}

	if _, err := tbl.AppendTable(ctx, arrowTable, 1024, nil); err != nil {
		return err
	}

	log.Printf("Wrote %d rows to Iceberg", arrowTable.NumRows())
	return nil
}

func handleRequest(ctx context.Context, event Event) (Response, error) {
	targetDate := event.TargetDate
	if targetDate == "" {
		if targetDate = os.Getenv("DEFAULT_TARGET_DATE"); targetDate == "" {
			targetDate = time.Now().AddDate(0, 0, -1).Format("2006-01-02")
		}
	}

	if _, err := db.Exec("CREATE OR REPLACE SECRET (TYPE s3, PROVIDER credential_chain)"); err != nil {
		return Response{StatusCode: 500, Message: err.Error()}, err
	}

	arrowTable, err := readDataFromS3(ctx, targetDate)
	if err != nil {
		return Response{StatusCode: 500, Message: err.Error()}, err
	}
	if arrowTable == nil {
		return Response{StatusCode: 200, Message: "No data", RowsProcessed: 0}, nil
	}
	defer arrowTable.Release()

	if err := writeToIceberg(ctx, arrowTable); err != nil {
		return Response{StatusCode: 500, Message: err.Error()}, err
	}

	return Response{StatusCode: 200, Message: "Success", RowsProcessed: int(arrowTable.NumRows())}, nil
}

func main() {
	lambda.Start(handleRequest)
}
