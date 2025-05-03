import os
import json
import boto3
from botocore.exceptions import ClientError

COGNITO_USER_POOL_ID = os.environ.get("COGNITO_USER_POOL_ID")
COGNITO_CLIENT_ID = os.environ.get("COGNITO_CLIENT_ID")
cognito_client = boto3.client("cognito-idp")

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

def lambda_handler(event, context):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "CORS preflight success"})
            }

        body = json.loads(event["body"])
        username = body["email"]
        password = body["password"]

        response = cognito_client.initiate_auth(
            ClientId=COGNITO_CLIENT_ID,
            AuthFlow="USER_PASSWORD_AUTH",
            AuthParameters={
                "USERNAME": username,
                "PASSWORD": password
            }
        )

        auth_result = response["AuthenticationResult"]
        
        user_info = cognito_client.get_user(
            AccessToken=auth_result["AccessToken"]
        )

        user_groups = cognito_client.admin_list_groups_for_user(
            Username=username,
            UserPoolId=COGNITO_USER_POOL_ID
        )
        
        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps({
                "message": "Login successful",
                "idToken": auth_result["IdToken"],
                "accessToken": auth_result["AccessToken"],
                "refreshToken": auth_result.get("RefreshToken", None),
                "user_info": user_info,
                "user_groups": user_groups.get("Groups", []),
            }, default=str)
        }

    except ClientError as e:
        return {
            "statusCode": 401,
            "headers": CORS_HEADERS,
            "body": json.dumps({"code": e.response["Error"]["Code"], "message": e.response["Error"]["Message"]})
        }
    except Exception as ex:
        return {
            "statusCode": 500,
            "headers": CORS_HEADERS,
            "body": json.dumps({"message": "Internal Server Error", "error": str(ex)})
        }
