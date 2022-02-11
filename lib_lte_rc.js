/**
 * Created by Wonseok, Jung in KETI on 2021-06-25.
 */

let mqtt = require('mqtt');
let fs = require('fs');
let SerialPort = require('serialport');

let sbusPort = null;

let sbusPortNum = libPort;
let sbusBaudrate = libBaudrate;

let TIMEOUT = 40;
let count_threshold = 50;

let rxbuf1 = "ff7d7d7d7c3a19191919191919191919197c7c7e7b7d7d7d7d7d19191919191919f6";
let rxbuf2 = "ff7d7d7d7c3a19191919191919191919197c7b7c7d7d7d7d7d7d19191919191919dd";
let default_data = rxbuf1;
let rc_data = '';

// setInterval(crt_default, TIMEOUT);
setInterval(channel_val, TIMEOUT);

let lte_count = 0;
let lte_rc_data;

function channel_val() {
    // console.log('rc_data - ' + rc_data);
    // console.log('default_data - ', default_data);
    if (rc_data !== null) {
        lte_rc_data = rc_data;

        rc_data = null;
        lte_count = 0;
        // console.log('if ======================', lte_rc_data);
    } else {
        if (lte_count >= count_threshold) {
            if (default_data === rxbuf1) {
                default_data = rxbuf2;
            } else if (default_data === rxbuf2) {
                default_data = rxbuf1;
            } else {
                default_data = rxbuf1;
            }
            lte_rc_data = default_data;
            // console.log('else ======================', lte_rc_data, '\r\n', lte_count);
        } else {
            // console.log('else else ======================', lte_rc_data, '\r\n', lte_count);
            lte_count++;
        }
    }
    // console.log('===========================================');
    // console.log('lte_rc_data - ', lte_rc_data);
    // console.log('===========================================');
    sbusPort.write(Buffer.from(lte_rc_data, 'hex'));
    lib_mqtt_client.publish(data_topic, lte_rc_data);
}

// let crc8_Table = [
//     0, 94, 188, 226, 97, 63, 221, 131, 194, 156, 126, 32, 163, 253, 31, 65,  // 0 ~ 15
//     157, 195, 33, 127, 252, 162, 64, 30, 95, 1, 227, 189, 62, 96, 130, 220,  // 16 ~ 31
//     35, 125, 159, 193, 66, 28, 254, 160, 225, 191, 93, 3, 128, 222, 60, 98,  // 32 ~ 47
//     190, 224, 2, 92, 223, 129, 99, 61, 124, 34, 192, 158, 29, 67, 161, 255,		// 48 ~ 63
//     70, 24, 250, 164, 39, 121, 155, 197, 132, 218, 56, 102, 229, 187, 89, 7,  // 64 ~ 79
//     219, 133, 103, 57, 186, 228, 6, 88, 25, 71, 165, 251, 120, 38, 196, 154,  // 80 ~ 95
//     101, 59, 217, 135, 4, 90, 184, 230, 167, 249, 27, 69, 198, 152, 122, 36,   // 96 ~ 111
//     248, 166, 68, 26, 153, 199, 37, 123, 58, 100, 134, 216, 91, 5, 231, 185,  // 112 ~ 127
//     140, 210, 48, 110, 237, 179, 81, 15, 78, 16, 242, 172, 47, 113, 147, 205,  // 128 ~ 143
//     17, 79, 173, 243, 112, 46, 204, 146, 211, 141, 111, 49, 178, 236, 14, 80,  // 144 ~ 159
//     175, 241, 19, 77, 206, 144, 114, 44, 109, 51, 209, 143, 12, 82, 176, 238,  // 160 ~ 175
//     50, 108, 142, 208, 83, 13, 239, 177, 240, 174, 76, 18, 145, 207, 45, 115,  // 176 ~ 191
//     202, 148, 118, 40, 171, 245, 23, 73, 8, 86, 180, 234, 105, 55, 213, 139, // 192 ~ 207
//     87, 9, 235, 181, 54, 104, 138, 212, 149, 203, 41, 119, 244, 170, 72, 22,  // 208 ~ 223
//     233, 183, 85, 11, 136, 214, 52, 106, 43, 117, 151, 201, 74, 20, 246, 168,  // 224 ~ 239
//     116, 42, 200, 150, 21, 75, 169, 247, 182, 232, 10, 84, 215, 137, 107, 53  // 240 ~ 255
// ];
//
// function Calc_CRC_8(DataArray, Length) {
//     let i;
//     let crc;
//
//     crc = 0x01;
//     DataArray = Buffer.from(DataArray, 'hex');
//     for (i = 1; i < Length; i++) {
//         crc = crc8_Table[crc ^ DataArray[i]];
//     }
//     return crc;
// }

sbusPortOpening();

function sbusPortOpening() {
    if (sbusPort === null) {
        sbusPort = new SerialPort(sbusPortNum, {
            baudRate: parseInt(sbusBaudrate, 10),
        });

        sbusPort.on('open', sbusPortOpen);
        sbusPort.on('close', sbusPortClose);
        sbusPort.on('error', sbusPortError);
        sbusPort.on('data', sbusPortData);
    } else {
        if (sbusPort.isOpen) {

        } else {
            sbusPort.open();
        }
    }
}

function sbusPortOpen() {
    console.log('sbusPort open. ' + sbusPortNum + ' Data rate: ' + sbusBaudrate);
}

function sbusPortClose() {
    console.log('sbusPort closed.');

    setTimeout(sbusPortOpening, 2000);
}

function sbusPortError(error) {
    let error_str = error.toString();
    // console.log('[sbusPort error]: ' + error.message);
    if (error_str.substring(0, 14) === "Error: Opening") {

    } else {
        // console.log('sbusPort error : ' + error);
    }

    setTimeout(sbusPortOpening, 2000);
}

function sbusPortData(data) {
    //console.log(data.toString());
}


let lib;

try {
    lib = JSON.parse(fs.readFileSync('./' + config.directory_name + '/lib_lte_rc.json', 'utf8'));
} catch (e) {
    lib = {
        name: 'lib_lte_rc',
        target: 'armv6',
        description: "node [name] [portnum] [baudrate]",
        scripts: 'node lib_lte_rc /dev/ttyUSB3 115200',
        data: ['SBUS'],
        control: ['REMOTE']
    };
}

let lib_mqtt_client = null;

lib_mqtt_connect('localhost', 1883);

let control_topic = '/MUV/control/' + lib.name + '/' + lib.control[0]
let data_topic = '/MUV/data/' + lib.name + '/' + lib.data[0]

function lib_mqtt_connect(broker_ip, port) {
    if (lib_mqtt_client == null) {
        var connectOptions = {
            host: broker_ip,
            port: port,
            protocol: "mqtt",
            keepalive: 10,
            protocolId: "MQTT",
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 2000,
            connectTimeout: 2000,
            rejectUnauthorized: false
        };

        lib_mqtt_client = mqtt.connect(connectOptions);
    }

    lib_mqtt_client.on('connect', function () {
        console.log('[lib_mqtt_connect] connected to ' + broker_ip);
        lib_mqtt_client.subscribe(control_topic);
        console.log('[lib_mqtt_connect] control_topic: ' + control_topic);
    });

    lib_mqtt_client.on('message', function (topic, message) {
        if (topic === control_topic) {
            rc_data = message.toString('hex');
        }
    });

    lib_mqtt_client.on('error', function (err) {
        console.log(err.message);
    });
}
