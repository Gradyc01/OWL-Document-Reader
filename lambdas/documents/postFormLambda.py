import json
import base64
# boto3 and botocore are used for AWS integration.
# Licensed under the Apache License 2.0.
# See LICENSE.md for full details
import boto3
from botocore.exceptions import BotoCoreError, ClientError

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
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

        file = body.get("file")    
        file_name = body.get("fileName")
        metadata = body.get("metadata", {})
        
        if not file or not file_name:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Missing file or fileName"})
            }

        if body.get("type") not in ["forms", "ids"]:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Invalid type" + body.get("type")})
            }

        S3_BUCKET_NAME = "owl-" + body.get("type")
        S3_FOLDER = body.get("type") + "/"

        file_bytes = base64.b64decode(file)

        # Paths for document and metadata
        s3_document_key = f"{S3_FOLDER}{file_name}"
        s3_metadata_key = f"{S3_METADATA_FOLDER}{file_name}.json"

        # Upload document
        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_document_key,
            Body=file_bytes,
            ContentType="application/octet-stream" # no mime type, could be problematic
        )

        # Upload metadata as JSON
        # Commented out this part because unnecessary. Put it back in if needed.
        # metadata["fileName"] = file_name  # Include original filename in metadata
        # metadata["s3DocumentPath"] = s3_document_key  # Link metadata to document
        metadata_json = json.dumps(metadata)

        s3_client.put_object(
            Bucket=S3_BUCKET_NAME,
            Key=s3_metadata_key,
            Body=metadata_json,
            ContentType="application/json"
        )

        # Construct URLs
        s3_document_url = f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{s3_document_key}"
        s3_metadata_url = f"https://{S3_BUCKET_NAME}.s3.amazonaws.com/{s3_metadata_key}"

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "message": "File and metadata uploaded successfully",
                "s3DocumentUrl": s3_document_url,
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
