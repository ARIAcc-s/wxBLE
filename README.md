# 微信蓝牙库

## 如何使用

1. 初始化对象

```js
let bleDevice = new BLEDevice({ 
  debug: true,   // 打开调试模式
  connectTimeout: 20000   //连接超时，单位毫秒
})
```

2. 打开蓝牙适配器

```js
bleDevice.openBluetoothAdapter()
  .then(() => {
    // 打开成功
  }).catch((res) => {
    // 打开失败
  })
```

3. 扫描设备

```js
bleDevice.startBluetoothDevicesDiscovery("00001101-0000-0100-8000-00805F9B34FB", (res) => {
    if (res.success) {
    // 发现设备
    console.log("device", res.foundDevices);
    } else {
    // 发生错误
    }
});
```

4. 连接蓝牙设备

```js
bleDevice.createBLEConnection(deviceId).then(() => {
    // 连接成功
}).catch(() => {
    // 连接失败
})
```

5. 订阅特征

```js
bleDevice.notifyBLECharacteristicValueChange(
  "0000FF00-0000-1000-8000-00805F9B34FB",   //服务uuid
  "0000FF02-0000-1000-8000-00805F9B34FB", //特征uuid
  (characteristic) => {
    // 特征值变化
    console.log(characteristic.value)
  }).then(() => {
    // 订阅成功
  }).catch(() => {
    // 订阅失败
  });
```

6. 取消订阅特征
```js
bleDevice.unNotifyBLECharacteristicValueChange(
  "0000FF00-0000-1000-8000-00805F9B34FB",   //服务uuid
  "0000FF02-0000-1000-8000-00805F9B34FB", //特征uuid
  ).then(() => {
    // 取消订阅成功
  }).catch(() => {
    // 取消订阅失败
  });
```

7. 向特征值中写入二进制数据
```js
let buffer = new ArrayBuffer(4);
let dataView = new DataView(buffer);
dataView.setUint8(0, 0xF0);
dataView.setUint8(1, 0x01);
dataView.setUint8(2, 0x02);
dataView.setUint8(3, 0x55);

bleDevice.writeBLECharacteristicValue(
  "0000FF00-0000-1000-8000-00805F9B34FB", //服务uuid
  "0000FF01-0000-1000-8000-00805F9B34FB", //特征uuid
  buffer  //ArrayBuffer
);
```

8.  读取特征值
```js
bleDevice.readBLECharacteristicValue(
  "0000FF00-0000-1000-8000-00805F9B34FB",   //服务uuid
  "0000FF02-0000-1000-8000-00805F9B34FB", //特征uuid
  (characteristic) => {
    // 特征值变化
    console.log(characteristic.value)
  }).then(() => {
    // 读取成功
  }).catch(() => {
    // 读取失败
  });
```

9. 断开蓝牙连接
```js
bleDevice.closeBLEConnection();
```