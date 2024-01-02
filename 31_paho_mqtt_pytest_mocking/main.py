import json
import paho.mqtt.client as mqtt  # MQTTのライブラリをインポート
import logging

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)


# ブローカーに接続できたときの処理
def on_connect(client, userdata, flag, rc):
    logger.info("Connected with return code " + str(rc))  # 接続できた旨表示
    logger.info("subscribe drone/#")
    client.subscribe("drone/#")  # subするトピックを設定


# ブローカーが切断したときの処理
def on_disconnect(client, userdata, rc):
    if rc != 0:
        logger.warning("Unexpected disconnection.")


# publishが完了したときの処理
def on_publish(client, userdata, mid):
    logger.info(f"published: client:{client}, userdata: {userdata}, mid: {mid}")


def publish_msg(client, topic, msg):
    logger.info(f"publish client:{client},topic:{topic},msg:{msg}")
    client.publish(topic, msg)  # トピック名とメッセージを決めて送信


# メッセージが届いたときの処理
def on_message(client, userdata, msg):
    # msg.topicにトピック名が，msg.payloadに届いたデータ本体が入っている
    payload = json.loads(msg.payload.decode())
    topic = str(msg.topic)
    logger.info(
        f"Received payload:{str(payload)}, topic: {topic},  with QoS: {str(msg.qos)}, userdata: {str(userdata)}"
    )
    if "drone/" in topic:
        dron_num = topic.split("/")[1]
        if payload["status"] == "running":
            userdata.add(topic)
            publish_msg(client, f"feed/drone/{dron_num}", "start-runnning")
        elif payload["status"] == "stopped":
            userdata.discard(topic)
            publish_msg(client, f"feed/drone/{dron_num}", "stopped")


def main():
    # MQTTの接続設定
    active_drones = set()
    client = mqtt.Client(userdata=active_drones)  # クラスのインスタンス(実体)の作成
    client.on_connect = on_connect  # 接続時のコールバック関数を登録
    client.on_disconnect = on_disconnect  # 切断時のコールバックを登録
    client.on_message = on_message  # メッセージ到着時のコールバック
    client.on_publish = on_publish  # メッセージ送信時のコールバック

    client.connect("localhost", 1883, 60)  # 接続先は自分自身

    client.loop_forever()  # 永久ループして待ち続ける


if __name__ == "__main__":
    main()
