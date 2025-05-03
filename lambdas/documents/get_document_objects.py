import json
import base64
# boto3 and botocore are used for AWS integration.
# Licensed under the Apache License 2.0.
# See LICENSE.md for full details
import boto3
from botocore.exceptions import ClientError

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}
S3_METADATA_FOLDER = "metadata/"

s3 = boto3.client('s3')

def lambda_handler(event, context):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "CORS preflight success"})
            }

        type = event.get('queryStringParameters').get('type')
        filename = event.get('queryStringParameters').get('filename')

        if type not in ["forms", "ids"]:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "Invalid type" + type})
            }
        
        bucket = f"owl-{type}"
        key = f"{type}/{filename}"
        metadata_key = f"{S3_METADATA_FOLDER}{filename}.json"

        s3_response_document = s3.get_object(Bucket=bucket, Key=key)
        s3_response_metadata = s3.get_object(Bucket=bucket, Key=metadata_key)

        response_document = base64.b64encode(s3_response_document['Body'].read()).decode('utf-8')
        response_metadata = json.loads(s3_response_metadata['Body'].read())

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(
                {
                "message": "Document object retrieval successful",
                "data": {"document": response_document, "metadata": response_metadata}
                },
                default=str
            )
        }

    except ClientError as error:
        return {
            "statusCode": 400,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Error retrieving document", "error": str(error)})
        }
    except Exception as e:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Unexpected error", "error": str(e)})
        }
