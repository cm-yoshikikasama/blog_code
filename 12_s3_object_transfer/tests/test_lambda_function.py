import pytest
from moto import mock_s3
import boto3
from botocore.exceptions import ClientError
import csv
import sys
from io import StringIO

sys.path.append("../")

from handler import get_csv_file, get_file_names, check_s3_objects_existence, log_result


@pytest.fixture
def s3_client():
    with mock_s3():
        conn = boto3.client("s3", region_name="us-east-1")
        yield conn


@pytest.fixture
def csv_file():
    file = StringIO()
    writer = csv.writer(file)
    writer.writerow(["test_a.pdf"])
    writer.writerow(["test_b.pdf"])
    writer.writerow(["test_c.pdf"])
    file.seek(0)
    return file.read()


def test_get_csv_file(s3_client, csv_file):
    s3_client.create_bucket(Bucket="test-bucket")
    s3_client.put_object(Bucket="test-bucket", Key="csv_list/sample.csv", Body=csv_file)

    content = get_csv_file(bucket_name="test-bucket", prefix="csv_list/")
    assert content == csv_file


def test_get_file_names(csv_file):
    file_names = get_file_names(csv_file)
    assert file_names == ["test_a.pdf", "test_b.pdf", "test_c.pdf"]


def test_check_s3_objects_existence(s3_client):
    s3_client.create_bucket(Bucket="test-bucket")
    s3_client.put_object(Bucket="test-bucket", Key="test_a.pdf", Body=b"test_a")
    s3_client.put_object(Bucket="test-bucket", Key="test_b.pdf", Body=b"test_b")

    result = check_s3_objects_existence(
        file_names=["test_a.pdf", "test_b.pdf", "test_c.pdf"], bucket_name="test-bucket"
    )
    assert result == {"test_a.pdf": True, "test_b.pdf": True, "test_c.pdf": False}


def test_check_s3_objects_existence_error(s3_client):
    s3_client.create_bucket(Bucket="test-bucket")
    s3_client.put_object(Bucket="test-bucket", Key="test_a.pdf", Body=b"test_a")
    s3_client.put_object(Bucket="test-bucket", Key="test_b.pdf", Body=b"test_b")

    with pytest.raises(ClientError):
        check_s3_objects_existence(
            file_names=["test_a.pdf", "test_b.pdf", "test_c.pdf"], bucket_name="test-bucket-dummy"
        )


def test_log_result(caplog):
    log_result(result={"test_a.pdf": True, "test_b.pdf": True, "test_c.pdf": False})
    assert "test_a.pdf exists." in caplog.text
    assert "test_b.pdf exists." in caplog.text
    assert "test_c.pdf does not exist." in caplog.text
