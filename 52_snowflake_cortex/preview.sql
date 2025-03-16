SELECT PARSE_JSON(
  SNOWFLAKE.CORTEX.SEARCH_PREVIEW(
      'travel_intelligence.data.travel_review_search',
      '{
        "query": "富士山の景色が見える高級旅館",
        "columns": [
            "review_id",
            "customer_name",
            "hotel_name",
            "destination",
            "rating",
            "review_text"
        ],
        "limit": 3
      }'
  )
)['results'] as results;
