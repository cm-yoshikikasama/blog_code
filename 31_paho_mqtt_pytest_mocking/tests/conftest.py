import pytest
import paho.mqtt.client as mqtt


def pytest_runtest_setup(item):
    print(f"--------Start----{item.name}---")


def pytest_runtest_teardown(item, nextitem):
    print(f"--------End----{item.name}-----")


# MQTTクライアントのモックを提供するフィクスチャ
@pytest.fixture
def mock_client(mocker):
    return mocker.Mock(spec=mqtt.Client)


# active_dronesをフィクスチャとして定義
@pytest.fixture(scope="module")
def active_drones():
    return set()
