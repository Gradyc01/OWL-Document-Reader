import boto3
import botocore.exceptions as ex

rds_client = boto3.client('rds-data')
database_name: str = 'owldb'
db_cluster_arn: str = 'arn:aws:rds:us-east-2:536697256476:cluster:owl-db-cluster'
db_credentials_secrets_store_arn: str = 'arn:aws:secretsmanager:us-east-2:536697256476:secret:rds!cluster-bc988741-caee-489a-81b0-4261cfcbea3e-4Gs3QE'

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}

def execute_statement(sql: str, parameters: dict):
    """
    A Utility Function that executes a line of sql with parameters 
    """
    print("Sending SQL to the database...")
    response = None
    try: 
        response = rds_client.execute_statement(
            secretArn=db_credentials_secrets_store_arn,
            database=database_name,
            resourceArn=db_cluster_arn,
            sql=sql,
            parameters=[{'name': key, 'value': {'stringValue': value}} for key, value in parameters.items()]
        )
        print("Success!")
    except ex.ClientError as e:
        if (e.response['Error']['Code'] == "DatabaseResumingException"):
            print("Failed! Database Cold Started, Trying Again... ")
            return execute_statement(sql, parameters)
        response = {
            'statusCode': 400,
            'body': {
                "Error": e.response['Error']['Code'],
                "ErrorMessage": e.response['Error']['Message']
            }
        }
        print("Failed!")

    return response

def execute(sql: str):
    """
    A Utility Function that executes a line of sql without parameters 
    """
    response = None
    try: 
        response = rds_client.execute_statement(
            secretArn=db_credentials_secrets_store_arn,
            database=database_name,
            resourceArn=db_cluster_arn,
            sql=sql
        )
    except ex.ClientError as e:
        if (e.response['Error']['Code'] == "DatabaseResumingException"):
            return execute(sql)
        response = {
            'statusCode': 400,
            'body': {
                "Error": e.response['Error']['Code'],
                "ErrorMessage": e.response['Error']['Message']
            }
        }

    return response

def checkColdStart() -> bool:
    """
    A Utility Function that checks whether or not the RDS database is starting Cold

    Output:
    Returns true if there is no cold start, False otherwise
    """
    response = None
    try: 
        response = rds_client.execute_statement(
            secretArn=db_credentials_secrets_store_arn,
            database=database_name,
            resourceArn=db_cluster_arn,
            sql="SELECT * FROM users LIMIT 1;"
        )

        return response["ResponseMetadata"]["HTTPStatusCode"] == 200
    except ex.ClientError as e:
        return False
