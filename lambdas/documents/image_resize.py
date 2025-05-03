import base64
import json
from io import BytesIO
from PIL import Image

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}


def resize_image_to_letter_width(base64_image: str, dpi: int = 200) -> str:
    image_data = base64.b64decode(base64_image)
    image = Image.open(BytesIO(image_data))

    # Target width in pixels for US Letter width (8.5 inches at 200 DPI)
    letter_width_px = int(8.5 * dpi)

    # Calculate new height to maintain aspect ratio
    width_percent = letter_width_px / float(image.width)
    new_height = int((float(image.height) * float(width_percent)))

    resized_image = image.resize((letter_width_px, new_height), Image.LANCZOS)

    buffer = BytesIO()
    resized_image.save(buffer, format=image.format)
    buffer.seek(0)

    return base64.b64encode(buffer.read()).decode('utf-8')


def lambda_handler(event, context):
    try:
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "CORS preflight success"})
            }

        if isinstance(event, str):
            return {
                'statusCode': 400,
                "headers": CORS_HEADERS,
                'body': json.dumps({'error': f"event is a string: {e}"})
            }

        body = json.loads(event["body"])
        image_base64 = body.get('image_base64')

        if not image_base64:
            logger.error("Missing 'image_base64' in input event.")
            return {
                'statusCode': 400,
                "headers": CORS_HEADERS,
                'body': json.dumps({'error': "Input Error: 'image_base64' key not found or is empty in the event payload."})
            }

        resized_image = resize_image_to_letter_width(image_base64)

        return {
            'statusCode': 200,
            "headers": CORS_HEADERS,
            'body': json.dumps({
                'message': 'File converted successfully.',
                'resized_image': resized_image
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            "headers": CORS_HEADERS,
            'body': f'Error processing PDF: {str(e)}'
        }

