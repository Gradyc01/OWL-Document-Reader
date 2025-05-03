import json
import base64
import logging
import boto3
from botocore.exceptions import ClientError
from io import BytesIO
import zxingcpp
import numpy as np
import cv2

# Set up logging
logger = logging.getLogger(__name__)

# Get the boto3 Textract client
textract_client = boto3.client('textract')

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,POST, GET"
}

def lambda_handler(event, context):
    try:
        # Handle CORS preflight request
        if event.get("httpMethod") == "OPTIONS":
            return {
                "statusCode": 200,
                "headers": CORS_HEADERS,
                "body": json.dumps({"message": "CORS preflight success"})
            }

        # Parse the request body
        body = json.loads(event.get("body", "{}"))
        images_base64 = body.get("images")
        doc_type = body.get("docType")

        # Validate required fields
        if not images_base64 or not isinstance(images_base64, list) or not doc_type:
            return {
                "statusCode": 400,
                "headers": CORS_HEADERS,
                "body": json.dumps({
                    "Error": "Missing required fields",
                    "ErrorMessage": "Both 'images' (list) and 'docType' are required."
                })
            }

        results = []

        for idx, image_base64 in enumerate(images_base64):
            try:
                image_bytes = base64.b64decode(image_base64)
                extracted_data = []

                barcode_data = scan_barcode(image_bytes)
                if barcode_data:
                    for barcode in barcode_data:
                        barcode["PageNumber"] = idx + 1
                        extracted_data.append(barcode)

                image = {'Bytes': image_bytes}

                if doc_type == "id":
                    textract_data = extract_form_details(image)
                elif doc_type == "form":
                    textract_data = extract_form_details(image)
                else:
                    textract_data = {
                        "Error": "Invalid doctype",
                        "ErrorMessage": "The specified doctype is not supported."
                    }

                if isinstance(textract_data, list):
                    for field in textract_data:
                        field["PageNumber"] = idx + 1
                    extracted_data.extend(textract_data)

                results.append({
                    "DocumentIndex": idx,
                    "Result": extracted_data
                })
            except Exception as e:
                logger.error(f"Error processing document {idx}: {str(e)}")
                results.append({
                    "DocumentIndex": idx,
                    "Result": {
                        "Error": "ProcessingError",
                        "ErrorMessage": str(e)
                    }
                })

        return {
            "statusCode": 200,
            "headers": CORS_HEADERS,
            "body": json.dumps(results)
        }

    except ClientError as err:
        error_message = "Couldn't analyze image. " + err.response['Error']['Message']
        logger.error("Error function %s: %s", context.invoked_function_arn, error_message)

        return {
            'statusCode': 400,
            "headers": CORS_HEADERS,
            'body': json.dumps({
                "Error": err.response['Error']['Code'],
                "ErrorMessage": error_message
            })
        }
    except Exception as e:
        logger.error("Error function %s: %s", context.invoked_function_arn, str(e))
        return {
            'statusCode': 500,
            "headers": CORS_HEADERS,
            'body': json.dumps({
                "Error": "InternalServerError",
                "ErrorMessage": str(e)
            })
        }

def scan_barcode(image_bytes):
    """Scan for barcodes and return data if found, including position information"""
    try:
        nparr = np.frombuffer(image_bytes, np.uint8)
        cv_image = cv2.imdecode(nparr, cv2.IMREAD_GRAYSCALE)
        _, binary_image = cv2.threshold(cv_image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        if cv_image is None:
            logger.warning("Failed to decode image bytes with OpenCV")
            return None
        
        img_height, img_width = cv_image.shape[:2]
        detected_barcodes = []
        
        try:
            barcodes = zxingcpp.read_barcodes(binary_image)
                
            for barcode in barcodes:
                position = barcode.position
                bbox = calculate_bbox(position, img_width, img_height)
                    
                detected_barcodes.append({
                    "Key": f"Barcode_{len(detected_barcodes) + 1} ({str(barcode.format)})",
                    "Value": barcode.text,
                    "Confidence": 100.0,
                    "BBox": bbox
                })
                    
            if barcodes:
                logger.info(f"Found {len(barcodes)} barcodes")
        except Exception as e:
            logger.warning(f"Barcode scan failed: {str(e)}")
        
        if detected_barcodes:
            logger.info(f"Total of {len(detected_barcodes)} barcodes detected")
            return detected_barcodes
        else:
            logger.info("No barcodes detected in image")
            return None
            
    except Exception as e:
        logger.warning(f"Barcode scan failed with error: {str(e)}")
        return None

def calculate_bbox(position, img_width, img_height):
    try:
        x_coords = [
            position.top_left.x, 
            position.top_right.x, 
            position.bottom_right.x, 
            position.bottom_left.x
        ]
        
        y_coords = [
            position.top_left.y, 
            position.top_right.y, 
            position.bottom_right.y, 
            position.bottom_left.y
        ]
        
        min_x = min(x_coords)
        min_y = min(y_coords)
        max_x = max(x_coords)
        max_y = max(y_coords)
        
        width = max_x - min_x
        height = max_y - min_y
        
        left = min_x / img_width
        top = min_y / img_height
        norm_width = width / img_width
        norm_height = height / img_height
        
        return {
            "Left": float(left),
            "Top": float(top),
            "Width": float(norm_width),
            "Height": float(norm_height)
        }
    except Exception as e:
        logger.warning(f"Error calculating bbox: {str(e)}")
        return {
            "Left": 0.0,
            "Top": 0.0,
            "Width": 0.0,
            "Height": 0.0
        }


def extract_form_details(image):
    response = textract_client.analyze_document(
        Document=image,
        FeatureTypes=["FORMS", "SIGNATURES"]
    )

    blocks = response['Blocks']
    key_map, value_map, block_map = {}, {}, {}

    for block in blocks:
        block_id = block["Id"]
        block_map[block_id] = block

        if block["BlockType"] == "KEY_VALUE_SET":
            if "EntityTypes" in block and "KEY" in block["EntityTypes"]:
                key_map[block_id] = block
            elif "EntityTypes" in block and "VALUE" in block["EntityTypes"]:
                value_map[block_id] = block

    key_counts = {}
    key_value_pairs = []

    for key_id, key_block in key_map.items():
        key_text, key_confidence = get_text_with_confidence(key_block, block_map)
        key_position = key_block.get("Geometry", {}).get("BoundingBox", {})

        for relationship in key_block.get("Relationships", []):
            if relationship["Type"] == "VALUE":
                for value_id in relationship["Ids"]:
                    value_block = value_map.get(value_id, {})
                    value_text, value_confidence = get_text_with_confidence(value_block, block_map)

                    unique_key = key_text
                    if key_text in key_counts:
                        key_counts[key_text] += 1
                        unique_key = f"{key_text}_{key_counts[key_text]}"
                    else:
                        key_counts[key_text] = 1

                    key_value_pairs.append({
                        "Key": unique_key,
                        "Value": value_text,
                        "Confidence": min(key_confidence, value_confidence),
                        "BBox": {
                            "Left": key_position.get("Left", 0.0),
                            "Top": key_position.get("Top", 0.0),
                            "Width": key_position.get("Width", 0.0),
                            "Height": key_position.get("Height", 0.0)
                        }
                    })

    key_value_pairs.sort(key=lambda kv: (kv["BBox"]["Top"], kv["BBox"]["Left"]))
    signatures = detect_signatures(blocks)
    key_value_pairs.extend(signatures)

    return key_value_pairs

def detect_signatures(blocks):
    signatures = []
    for block in blocks:
        if block.get("BlockType") == "SIGNATURE":
            bbox = block.get("Geometry", {}).get("BoundingBox", {})
            confidence = block.get("Confidence", 0.0)
            signatures.append({
                "Key": "Signature",
                "Value": "",
                "Confidence": confidence,
                "BBox": {
                    "Left": bbox.get("Left", 0.0),
                    "Top": bbox.get("Top", 0.0),
                    "Width": bbox.get("Width", 0.0),
                    "Height": bbox.get("Height", 0.0)
                }
            })
    return signatures

def get_text_with_confidence(block, block_map):
    text = ""
    confidence = block.get("Confidence", 0)

    if "Relationships" in block:
        for relationship in block["Relationships"]:
            if relationship["Type"] == "CHILD":
                for child_id in relationship["Ids"]:
                    child_block = block_map.get(child_id, {})
                    text += " " + child_block.get("Text", "")
                    confidence = min(confidence, child_block.get("Confidence", confidence))

    return text.strip(), confidence
