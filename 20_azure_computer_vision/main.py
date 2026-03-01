import os
import time

from azure.cognitiveservices.vision.computervision import ComputerVisionClient
from azure.cognitiveservices.vision.computervision.models import (
    ComputerVisionOcrErrorException,
    OperationStatusCodes,
)
from msrest.authentication import CognitiveServicesCredentials

key = os.environ["ACCOUNT_KEY"]
endpoint = os.environ["END_POINT"]
image_path = "img/PXL_20230523_135425927.MP.jpg"  # ローカルの画像パス


def main(image_path):
    computervision_client = ComputerVisionClient(
        endpoint, CognitiveServicesCredentials(key)
    )
    local_image = open(image_path, "rb")
    try:
        recognize_results = computervision_client.read_in_stream(
            local_image, language="ja", raw=True
        )
    except ComputerVisionOcrErrorException as e:
        print("errors:", e.response)
        raise e
    # 結果を取得するための操作IDを取得
    operation_location_remote = recognize_results.headers["Operation-Location"]
    operation_id = operation_location_remote.split("/")[-1]

    # 結果が利用可能になるまで待つ
    while True:
        get_text_results = computervision_client.get_read_result(operation_id)
        if get_text_results.status not in ["notStarted", "running"]:
            break
        time.sleep(1)

    # テキストの出力
    if get_text_results.status == OperationStatusCodes.succeeded:
        with open("output.txt", "w", encoding="utf-8") as f:
            for text_result in get_text_results.analyze_result.read_results:
                for line in text_result.lines:
                    f.write(line.text + "\n")


print("Texts are written to output.txt")


if __name__ == "__main__":
    main(image_path)
