/**
 * Created by Wonseok Jung in KETI on 2021-07-01.
 */

// for TAS of mission

let mqtt = require('mqtt');
let fs = require('fs');
const { nanoid } = require('nanoid');

let my_msw_name = 'msw_lte_rc';

let fc = {};
global.config = {};

global.libPort = 0;
global.libBaudrate = 0;

config.name = my_msw_name;

try {  // for nCube-MUV (NodeJs)
    // if (msw_directory[my_msw_name] !== undefined) {
    //     config.directory_name = msw_directory[my_msw_name];
    //     config.sortie_name = '/' + my_sortie_name;
    //     config.gcs = drone_info.gcs;
    //     config.drone = drone_info.drone;
    //     config.lib = [];
    // }
    if (msw_directory[my_msw_name] !== undefined) {
        config.directory_name = msw_directory[my_msw_name];
        config.sortie_name = '/' + my_sortie_name;
        config.gcs = drone_info.gcs;
        config.drone = drone_info.drone;
        config.lib = [];
    }
} catch (e) {
    if (process.argv[5] !== null) {     // for nCube-MUV-Python
        config.directory_name = process.argv[3];
        config.sortie_name = '/' + process.argv[2];
        config.gcs = process.argv[4];
        config.drone = process.argv[5];
        config.lib = [];
    } else {
        config.sortie_name = 'disarm';
        config.directory_name = '';
        config.gcs = 'KETI_MUV';
        config.drone = 'KEA_Test';
        config.lib = [];
    }
}

let add_lib = {};
try {
    add_lib = JSON.parse(fs.readFileSync('./' + config.directory_name + '/lib_lte_rc.json', 'utf8'));
    config.lib.push(add_lib);
} catch (e) {
    add_lib = {
        name: 'lib_lte_rc',
        target: 'armv6',
        description: "node [name] [portnum] [baudrate]",
        scripts: 'node lib_lte_rc /dev/ttyUSB3 115200', // pkg 사용 binary로 변환
        data: ['SBUS'],
        control: ['REMOTE']
    };
    config.lib.push(add_lib);
}

// msw가 muv로 부터 트리거를 받는 용도
// 명세에 sub_container 로 표기
let msw_sub_muv_topic = [];

let msw_sub_fc_topic = [];
msw_sub_fc_topic.push('/Mobius/' + config.gcs + '/Drone_Data/' + config.drone + '/heartbeat');
msw_sub_fc_topic.push('/Mobius/' + config.gcs + '/Drone_Data/' + config.drone + '/global_position_int');
msw_sub_fc_topic.push('/Mobius/' + config.gcs + '/Drone_Data/' + config.drone + '/attitude');
msw_sub_fc_topic.push('/Mobius/' + config.gcs + '/Drone_Data/' + config.drone + '/battery_status');

let msw_sub_lib_topic = [];

let remote_topic = '/Mobius/' + config.gcs + '/RC_Data/KEA_RC';

function init() {
    if (config.lib.length > 0) {
        for (let idx in config.lib) {
            if (config.lib.hasOwnProperty(idx)) {
                if (msw_mqtt_client != null) {
                    for (let i = 0; i < config.lib[idx].control.length; i++) {
                        let sub_container_name = config.lib[idx].control[i];
                        // let _topic = '/Mobius/' + config.gcs + '/Mission_Data/' + config.drone + '/' + config.name + '/' + sub_container_name;
                        let _topic = '/Mobius/KETI_MUV/Mission_Data/KEA_Test/msw_lte_rc/' + sub_container_name;
                        msw_mqtt_client.subscribe(_topic);
                        msw_sub_muv_topic.push(_topic);
                        console.log('[msw_mqtt] msw_sub_muv_topic[' + i + ']: ' + _topic);
                    }

                    for (let i = 0; i < config.lib[idx].data.length; i++) {
                        let container_name = config.lib[idx].data[i];
                        let _topic = '/MUV/data/' + config.lib[idx].name + '/' + container_name;
                        msw_mqtt_client.subscribe(_topic);
                        msw_sub_lib_topic.push(_topic);
                        console.log('[lib_mqtt] lib_topic[' + i + ']: ' + _topic);
                    }
                }

                let obj_lib = config.lib[idx];
                setTimeout(runLib, 1000 + parseInt(Math.random() * 10), JSON.parse(JSON.stringify(obj_lib)));
            }
        }
    }
}

function runLib(obj_lib) {
    try {
        let scripts_arr = obj_lib.scripts.split(' ');

        libPort = scripts_arr[2];
        libBaudrate = scripts_arr[3];

        if (config.directory_name === '') {
            console.log('Cannot run with nCube-MUV.');
        } else {
            scripts_arr[0] = scripts_arr[0].replace('./', '');
            scripts_arr[0] = './' + config.directory_name + '/' + scripts_arr[0];
        }
        require('./lib_lte_rc');

    } catch (e) {
        console.log(e.message);
    }
}

let msw_mqtt_client = null;

msw_mqtt_connect('localhost', 1883);

function msw_mqtt_connect(broker_ip, port) {
    if (msw_mqtt_client == null) {
        let connectOptions = {
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

        msw_mqtt_client = mqtt.connect(connectOptions);
    }

    msw_mqtt_client.on('connect', function () {
        console.log('[msw_mqtt_connect] connected to ' + broker_ip);
        for (let idx in msw_sub_fc_topic) {
            if (msw_sub_fc_topic.hasOwnProperty(idx)) {
                msw_mqtt_client.subscribe(msw_sub_fc_topic[idx]);
                console.log('[msw_mqtt_connect] msw_sub_fc_topic[' + idx + ']: ' + msw_sub_fc_topic[idx]);
            }
        }
    });

    msw_mqtt_client.on('message', function (topic, message) {
        for (let idx in msw_sub_lib_topic) {
            if (msw_sub_lib_topic.hasOwnProperty(idx)) {
                if (topic === msw_sub_lib_topic[idx]) {
                    setTimeout(on_receive_from_lib, parseInt(Math.random() * 5), topic, message);
                    break;
                }
            }
        }

        for (let idx in msw_sub_fc_topic) {
            if (msw_sub_fc_topic.hasOwnProperty(idx)) {
                if (topic === msw_sub_fc_topic[idx]) {
                    setTimeout(on_process_fc_data, parseInt(Math.random() * 5), topic, message.toString());
                    break;
                }
            }
        }

        if (topic === remote_topic) {
            on_receive_from_muv(topic, message);
        }
    });

    msw_mqtt_client.on('error', function (err) {
        console.log(err.message);
    });
}

function on_receive_from_muv(topic, str_message) {
    // console.log('[' + topic + '] ' + str_message.toString('hex'));

    parseControlMission(topic, str_message);
}

function on_receive_from_lib(topic, str_message) {
    // console.log('[' + topic + '] ' + str_message);

    parseDataMission(topic, str_message);
}

function on_process_fc_data(topic, str_message) {
    let topic_arr = topic.split('/');
    fc[topic_arr[topic_arr.length - 1]] = JSON.parse(str_message.toString());

    parseFcData(topic, str_message);
}

setTimeout(init, 1000);

function parseDataMission(topic, str_message) {
    try {
        // User define Code
        // let obj_lib_data = JSON.parse(str_message);
        //
        // if(fc.hasOwnProperty('global_position_int')) {
        //     Object.assign(obj_lib_data, JSON.parse(JSON.stringify(fc['global_position_int'])));
        // }
        // str_message = JSON.stringify(obj_lib_data);

        ///////////////////////////////////////////////////////////////////////
        let topic_arr = topic.split('/');
        let data_topic = '/Mobius/' + config.gcs + '/Mission_Data/' + config.drone + '/' + config.name + '/' + topic_arr[topic_arr.length - 1];
        msw_mqtt_client.publish(data_topic + config.sortie_name, str_message);
    } catch (e) {
        // console.log('[parseDataMission] data format of lib is not json');
    }
}

///////////////////////////////////////////////////////////////////////////////

function parseControlMission(topic, str_message) {
    try {
        // User define Code
        ///////////////////////////////////////////////////////////////////////
        let topic_arr = topic.split('/');
        let _topic = '/MUV/control/' + config.lib[0].name + '/' + config.lib[0].control[0];
        msw_mqtt_client.publish(_topic, str_message);
    } catch (e) {
        console.log('[parseControlMission] data format of MUV is not json');
    }
    // let indata = JSON.parse(str_message);

    // console.log('[' + topic + '] ' + indata.con);
    // console.log('msw message received from nCube');
    // let container_name = config.lib[0].control[0];
    // let control_topic = '/MUV/control/' + config.lib[0].name + '/' + container_name;
    // console.log('topic: ' + topic + ' cmd: ' + str_message);
    // msw_mqtt_client.publish(control_topic, str_message);

}

function parseFcData(topic, str_message) {
    // User define Code
    // let topic_arr = topic.split('/');
    // if(topic_arr[topic_arr.length-1] == 'global_position_int') {
    //     let _topic = '/MUV/control/' + config.lib[0].name + '/' + config.lib[1].control[1]; // 'Req_enc'
    //     msw_mqtt_client.publish(_topic, str_message);
    // }
    ///////////////////////////////////////////////////////////////////////
}


let MSW_mobius_mqtt_client = null;

MSW_mobius_mqtt_connect(drone_info.host, 1883);

function MSW_mobius_mqtt_connect(broker_ip, port) {
    if (MSW_mobius_mqtt_client == null) {
        let connectOptions = {
            host: broker_ip,
            port: port,
            protocol: "mqtt",
            keepalive: 10,
            protocolId: "MQTT",
            protocolVersion: 4,
            clientId: 'mqttjs_' + config.drone + '_' + nanoid(15),
            clean: true,
            reconnectPeriod: 2000,
            connectTimeout: 2000,
            rejectUnauthorized: false
        };

        MSW_mobius_mqtt_client = mqtt.connect(connectOptions);
        MSW_mobius_mqtt_client.on('connect', function () {
            console.log('[msw_mobius_mqtt_connect] connected to ' + broker_ip);
            if (remote_topic !== '') {
                MSW_mobius_mqtt_client.subscribe(remote_topic);
                console.log('[msw_mobius_mqtt_subscribe] remote_topic : ' + remote_topic);
            }
        });

        MSW_mobius_mqtt_client.on('message', function (topic, message) {
            if (topic === remote_topic) {
                on_receive_from_muv(topic, message);
            }
        });

        MSW_mobius_mqtt_client.on('error', function (err) {
            console.log(err.message);
        });
    }
}
