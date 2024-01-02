# paho-mqtt with mac

## mosquitto install

```shell
brew install mosquitto
brew services start mosquitto
brew services list
brew services stop mosquitto
```

## run with mosquitto

main.pyをmosquittoが立ち上がった状態で実行

```shell
python main.py
```

test用のpublishコマンドをmosquittoが立ち上がった状態で実行

```shell
mosquitto_pub -h localhost -t "drone/001" -m '{"status": "running"}'
mosquitto_pub -h localhost -t "drone/002" -m '{"status": "running"}'
mosquitto_pub -h localhost -t "drone/001" -m '{"status": "stopped"}'
```



## python library install

```shell
pip install paho-mqtt pytest pytest-mock coverage
```

## python get  test coverage

```
coverage run -m pytest
coverage report
coverage html
```
index.htmlを開く

## run pytest

```
pytest -o log_cli=true -o log_cli_level=DEBUG -s
```


## 参考

- https://qiita.com/hsgucci/items/6461d8555ea1245ef6c2 
- https://marketplace.visualstudio.com/items?itemName=LittleFoxTeam.vscode-python-test-adapter 
- https://marketplace.visualstudio.com/items?itemName=LittleFoxTeam.vscode-python-test-adapter 
- https://github.com/eclipse/paho.mqtt.python/tree/master 
- https://github.com/audreyfeldroy/cookiecutter-pypackage

