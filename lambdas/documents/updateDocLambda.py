import json
# boto3 and botocore are used for AWS integration.
# Licensed under the Apache License 2.0.
# See LICENSE.md for full details
import boto3
from botocore.exceptions import BotoCoreError, ClientError

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "PUT,OPTIONS"
}
S3_METADATA_FOLDER = "metadata/"

s3_client = boto3.client("s3")

def lambda_handler(event, context):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "CORS preflight success"})
            }
        
        body = json.loads(event["body"])
 
        file_name = body.get("fileName")
        metadata = body.get("metadata", {})
        
        if not file_name:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Missing fileName"})
            }

        if body.get("type") not in ["forms", "ids"]:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Invalid type" + body.get("type")})
            }

        S3_BUCKET_NAME = "owl-" + body.get("type")

        # Paths for document and metadata
        s3_metadata_key = f"{S3_METADATA_FOLDER}{file_name}.json"

        metadata_json = json.dumps(metadata)

        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_metadata_key,
            Body=metadata_json,
            ContentType="application/json"
        )

        # Construct URL
        s3_metadata_url = f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{s3_metadata_key}"

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "message": "Metadata updated successfully",
                "s3MetadataUrl": s3_metadata_url
            })
        }

    except (BotoCoreError, ClientError) as error:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Error uploading file", "error": str(error)})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Unexpected error", "error": str(e)})
        }
