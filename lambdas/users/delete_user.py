import json
from lambdas.db_util import execute_statement


# rds_client = boto3.client('rds-data')
# database_name: str = 'owldb'
# db_cluster_arn: str = 'arn:aws:rds:us-east-2:536697256476:cluster:owl-db-cluster'
# db_credentials_secrets_store_arn: str = 'arn:aws:secretsmanager:us-east-2:536697256476:secret:rds!cluster-bc988741-caee-489a-81b0-4261cfcbea3e-4Gs3QE'

def lambda_handler(event, context):
    """
    Handles the lambda for deleting a specifc user with this user_id

    Input:
        event: 
            user_id = The User's id
        context:
            Not used

    Output: 
        returns the response from executing the statement with a json message
    """
    user_id = event.get('user_id')

    if not user_id:
        return {
            "statusCode": 400,
            "body": json.dumps("Missing user_id")
        }

    sql = "DELETE FROM users WHERE user_id = :user_id"
    response = execute_statement(sql, {'user_id': user_id})
    # return user_id
    return response

# def execute_statement(sql: str, parameters: dict):
#     response = rds_client.execute_statement(
#         secretArn=db_credentials_secrets_store_arn,
#         database=database_name,
#         resourceArn=db_cluster_arn,
#         sql=sql,
#         parameters=[{'name': key, 'value': {'stringValue': value}} for key, value in parameters.items()]
#     )
#     return response
