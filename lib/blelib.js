function BLEDevice(arg) {
  this.deviceId = "";
  this.serviceId = "";
  this.debug = arg ? (arg['debug'] || false) : false;
  this.connectTimeout = arg ? (arg['connectTimeout'] || 10000) : 10000;
  this.onBLECharacteristicValueChange = {}
};

/**
 * 日志输出
 * 
 * @param {msg} String
 *   输出的信息
 * @param {Array} args
 *   辅助输出信息
 */
BLEDevice.prototype.log = function (msg, ...args) {
  if (this.debug) {
    console.log(msg, ...args)
  }
};

BLEDevice.prototype.setStateCallBack = function (cb) {
  wx.onBluetoothAdapterStateChange((res) => {
    cb(res);
  });
}

/**
 * 初始化蓝牙模块
 * 
 * @return
 *   返回蓝牙模块Promise
 */
BLEDevice.prototype.openBluetoothAdapter = function() {
  return new Promise((resolve, reject) => {
    wx.openBluetoothAdapter({
      success: (res) => {
        this.log("openBluetoothAdapter", res);
        resolve(res);
      },
      fail: (res) => {
        this.log("openBluetoothAdapter failed", res)
        reject(res);
      }
    })
  })
};

/**
 * 关闭蓝牙模块
 */
BLEDevice.prototype.closeBluetoothAdapter = function() {
  wx.closeBluetoothAdapter();
};

/**
 * 获取本机蓝牙适配器状态
 */
BLEDevice.prototype.getBluetoothAdapterState = function () {
  wx.getBluetoothAdapterState({
    success: (res) => {
      if (res.discovering) {
        this.onBluetoothDeviceFound()
      } else if (res.available) {
        this.startBluetoothDevicesDiscovery(state.servicesId, state.key);
      }
    }
  })
};

/**
 * 开始搜寻附近的蓝牙外围设备
 * 
 * @param {String} servicesId
 *   要搜索的蓝牙设备主服务的uuid列表
 * @param {Function} cb
 *   发现设备后的回调
 *   若发现成功，参数success为true，foundDevices：发现的设备列表
 *   若发现失败，参数success为false
 * @return
 *   返回搜索蓝牙设备Promise
 */
BLEDevice.prototype.startBluetoothDevicesDiscovery = function (servicesId, cb) {
  let foundDevices = [];
  wx.onBluetoothDeviceFound((res) => {
    res.devices.forEach(device => {
      if (!device.name && !device.localName) {
        return;
      }

      const idx = inArray(foundDevices, 'deviceId', device.deviceId)

      if (idx === -1) {
        foundDevices.push(device)
      } else {
        foundDevices[idx] = device
      }
      this.log("onBluetoothDeviceFound", foundDevices);

      cb({ success: true, foundDevices: foundDevices});
    })
  })

  wx.startBluetoothDevicesDiscovery({
    services: servicesId,
    allowDuplicatesKey: true,
    success: (res) => {
      this.log("startBluetoothDevicesDiscovery", res);
    },
    fail: (res) => {
      cb({ success: false });
    }
  })
};

/**
 * 停止搜寻附近的蓝牙外围设备
 */
BLEDevice.prototype.stopBluetoothDevicesDiscovery = function () { 
  wx.stopBluetoothDevicesDiscovery();
};

/**
 * 连接低功耗蓝牙设备
 * 
 * @param {String} deviceId
 *   连接设备的ID
 * 
 * @return
 *   返回设备连接的Promise
 */
BLEDevice.prototype.createBLEConnection = function (deviceId) {
  this.deviceId = deviceId;
  return new Promise((resolve, reject) => {
    wx.createBLEConnection({
      deviceId: this.deviceId,
      success: (res) => {
        this.log("createBLEConnection", res)
        this.getBLEDeviceServices()
          .then(() => {
            resolve();
          }).catch((res) => {
            reject(res);
            this.closeBLEConnection();
          })
      },
      fail: (res) => {
        this.log("createBLEConnection failed", res)
        reject(res)
      }
    })
    this.stopBluetoothDevicesDiscovery();

    setTimeout(() => {
      reject('Connect timeout');
      this.closeBLEConnection();
    }, this.connectTimeout);
  })
};

/**
 * 断开与低功耗蓝牙设备的连接
 */
BLEDevice.prototype.closeBLEConnection = function () {
  wx.closeBLEConnection({
    deviceId: this.deviceId,
  })
};

/**
 * 获取蓝牙设备的所有服务
 * 
 * @param {String} findServicesUUID
 *   要查找的主服务uuid
 * 
 * @param {Number} findServicesIndex
 *   开始查找的位置
 * 
 * @return
 *   返回获取服务的Promise
 */
BLEDevice.prototype.getBLEDeviceServices = function () {
  return new Promise((resolve, reject) => {
    wx.getBLEDeviceServices({
      deviceId: this.deviceId,
      success: (res) => {
        let total = res.services.length
        for (let i = 0; i < res.services.length; i++) {
          this.log("getBLEDeviceServices",  res.services[i]);
          this.getBLEDeviceCharacteristics(res.services[i].uuid)
            .then(() => {
              total --;
              if (total === 0) {
                resolve();
              }
            })
            .catch(res => {
              reject(res);
            })
        }
      },
      fail: (res) => {
        reject(res);
      }
    })
  })
};

/**
 * 获取蓝牙设备某个服务中所有特征值
 * 
 * @param {String} serviceId
 *   要查找特征的service uuid
 * 
 * @return
 *   返回服务特征值的Promise
 */
BLEDevice.prototype.getBLEDeviceCharacteristics = function (serviceId) { 

  return new Promise((resolve, reject) => {
    wx.getBLEDeviceCharacteristics({
      deviceId: this.deviceId,
      serviceId: serviceId,
      success: (res) => {
        resolve(res);

        for (let i = 0; i < res.characteristics.length; i++) {
          this.log("getBLEDeviceCharacteristics",  i, res.characteristics[i]);
          let item = res.characteristics[i];
          if (item.properties.read) {
            this.log("可读：", res.characteristics[i]);
          }
          if (item.properties.write) {
            this.log("可写：", res.characteristics[i]);
          }
          if (item.properties.notify || item.properties.indicate) {
            this.log("可订阅", res.characteristics[i]);
          }
        }
      },
      fail: (res) => {
        reject(res);
      },
      complete: (res) => {
      }
    })
  })
};

/**
 * 读取低功耗蓝牙设备的特征值的二进制数据值
 * 
 * @param {String} serviceId
 *   蓝牙可订阅服务的uuid
 *
 * @param {String} readCharacteristicId
 *   蓝牙可读特征值的uuid
 *
 * @param {Function} callback
 *   特征变化的回调函数
 */
BLEDevice.prototype.readBLECharacteristicValue = function (serviceId, readCharacteristicId, callback) { 
  wx.onBLECharacteristicValueChange((characteristic) => {
    this.log("onBLECharacteristicValueChange", characteristic.value)
    let cb = this.onBLECharacteristicValueChange[readCharacteristicId]
    if (cb) {
      cb(characteristic)
    }
  })

  return new Promise((resolve, reject) => {
    wx.readBLECharacteristicValue({
      deviceId: this.deviceId,
      serviceId: serviceId,
      characteristicId: readCharacteristicId,
      success: (res) => {
        resolve(res)
        this.log('readBLECharacteristicValue', res);
        this.onBLECharacteristicValueChange[readCharacteristicId] = callback;
      },
      fail: (res) => {
        reject(res)
      }
    })
  })
};

/**
 * 向低功耗蓝牙设备特征值中写入二进制数据
 * 
 * @param {String} writeCharacteristicId
 *   蓝牙可写特征值的uuid
 * 
 *  @param {ArrayBuffer} buffer
 *   特征值对应的二进制值
 */
BLEDevice.prototype.writeBLECharacteristicValue = function (serviceId, writeCharacteristicId, buffer) { 
  // // 向蓝牙设备发送一个0x00的16进制数据
  this.log("writeBLECharacteristicValue buffer", buffer);
  wx.writeBLECharacteristicValue({
    deviceId: this.deviceId,
    serviceId: serviceId,
    characteristicId: writeCharacteristicId,
    value: buffer,
    success: (res) => {
      this.log('writeBLECharacteristicValue', res);
    }
  })
};

/**
 * 启用低功耗蓝牙设备特征值变化时的notify功能，订阅特征值
 * 
 * @param {String} serviceId
 *   蓝牙可订阅服务的uuid
 * 
 * @param {String} notifyCharacteristicId
 *   蓝牙可订阅特征值的uuid
 * 
 * @param {Function} callback
 *   特征变化的回调函数
 */
BLEDevice.prototype.notifyBLECharacteristicValueChange = function (serviceId, notifyCharacteristicId, callback) {
  
  wx.onBLECharacteristicValueChange((characteristic) => {
    this.log("onBLECharacteristicValueChange", characteristic.value)
    let cb = this.onBLECharacteristicValueChange[notifyCharacteristicId]
    if (cb) {
      cb(characteristic)
    }
  })
  return new Promise((reslove, reject) => {
    wx.notifyBLECharacteristicValueChange({
      deviceId: this.deviceId,
      serviceId: serviceId,
      characteristicId: notifyCharacteristicId,
      state: true,
      success: (res) => {
        reslove(res)
        this.log('notifyBLECharacteristicValueChange', res);
        this.onBLECharacteristicValueChange[notifyCharacteristicId] = callback
      },
      fail: (res) => {
        reject(res)
      }
    })
  })
};

/**
 * 关闭低功耗蓝牙设备特征值变化时的notify功能，订阅特征值
 * 
 * @param {String} serviceId
 *   蓝牙可订阅服务的uuid
 * 
 * @param {String} notifyCharacteristicId
 *   蓝牙可订阅特征值的uuid
 */
BLEDevice.prototype.unNotifyBLECharacteristicValueChange = function (serviceId, notifyCharacteristicId) {
  return new Promise((resolve, reject) => {
    delete this.onBLECharacteristicValueChange[notifyCharacteristicId]

    wx.notifyBLECharacteristicValueChange({
      deviceId: this.deviceId,
      serviceId: serviceId,
      characteristicId: notifyCharacteristicId,
      state: false,
      success: function (res) { 
        resolve(res)
      },
      fail: function (res) {
        reject(res)
      }
    })
  })
}


const inArray = (arr, key, val) => {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    }
  }
  return -1;
};

/**
 * ArrayBuffer转16进度字符串示例
 */
const ab2hex = (buffer) => {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2);
    }
  )
  return hexArr.join('');
};

module.exports = BLEDevice
