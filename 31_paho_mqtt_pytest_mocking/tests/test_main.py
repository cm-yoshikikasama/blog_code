import json
import sys
from pathlib import Path

# ルートディレクトリへのパスを追加
current_dir = Path(__file__).parent
root_dir = current_dir.parent
sys.path.append(str(root_dir))
import main  # noqa: E402
import pytest  # noqa: E402


def test_on_connect(mock_client):
    main.on_connect(mock_client, None, None, 0)
    mock_client.subscribe.assert_called_with("drone/#")


def test_on_disconnect(mocker, mock_client):
    # logger.warningのモックを作成
    mock_warning = mocker.patch("main.logger.warning")

    # 正常な切断シナリオ（rc=0）
    main.on_disconnect(mock_client, None, 0)
    mock_warning.assert_not_called()  # 通常の切断ではwarningが記録されないことを確認
    mock_warning.reset_mock()
    # 異常な切断シナリオ（rc!=0）
    main.on_disconnect(mock_client, None, 1)
    # 異常切断ではwarningが記録されることを確認
    mock_warning.assert_called_once_with("Unexpected disconnection.")


@pytest.mark.parametrize(
    "topic, status, expected_call",
    [
        ("drone/001", "running", "start-runnning"),
        ("drone/002", "stopped", "stopped"),
        ("drone/003", "running", "start-runnning"),
        ("drone/004", "stopped", "stopped"),
    ],
)
def test_on_message(mock_client, mocker, active_drones, topic, status, expected_call):
    mock_msg = mocker.Mock()
    payload_json = json.dumps({"status": status})
    mock_msg.topic = topic
    mock_msg.payload = payload_json.encode()
    mock_msg.qos = 1
    main.on_message(mock_client, active_drones, mock_msg)
    mock_client.publish.assert_called_once_with(f"feed/{topic}", expected_call)
    mock_client.publish.reset_mock()


def test_main(mocker, mock_client):
    mocker.patch("main.mqtt.Client", return_value=mock_client)
    main.main()
    mock_client.connect.assert_called_with("localhost", 1883, 60)
    mock_client.loop_forever.assert_called()
