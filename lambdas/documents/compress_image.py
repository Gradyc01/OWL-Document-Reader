import base64
import json
from io import BytesIO
from PIL import Image

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST"
}


def compress_base64_image(base64_str: str, quality: int = 60) -> str:
    # Decode base64 string to bytes
    image_data = base64.b64decode(base64_str)
    image = Image.open(BytesIO(image_data))

    # Convert to RGB if necessary (e.g. for PNGs with alpha)
    if image.mode in ("RGBA", "P"):
        image = image.convert("RGB")

    # Save image to buffer with compression
    buffer = BytesIO()
    format = image.format if image.format else "JPEG"  # Default to JPEG

    if format.upper() == "PNG":
        image.save(buffer, format="PNG", optimize=True)
    else:
        image.save(buffer, format="JPEG", quality=quality, optimize=True)

    # Get base64 encoded result
    compressed_bytes = buffer.getvalue()
    compressed_base64 = base64.b64encode(compressed_bytes).decode('utf-8')
    return compressed_base64


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

        compressed_image = compress_base64_image(image_base64)

        return {
            'statusCode': 200,
            "headers": CORS_HEADERS,
            'body': json.dumps({
                'message': 'File converted successfully.',
                'compressed_image': compressed_image
            })
        }

    except Exception as e:
        return {
            'statusCode': 500,
            "headers": CORS_HEADERS,
            'body': f'Error processing PDF: {str(e)}'
        }

