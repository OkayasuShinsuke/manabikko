// run.js — server.js が「更新を取り込んだので再起動して」と伝えてきたとき
// （終了コード87）、自動でもう一度起動し直すだけの薄いラッパー。
// `npm start` はこのファイルを起動する（server.js を直接は起動しない）。
const { spawn } = require('child_process');

let child = null;

function start() {
  child = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    if (code === 87) {
      console.log('\n🔄 更新を取り込んだので、サーバーを再起動します...\n');
      start();
      return;
    }
    // Ctrl+C（SIGINT）などで終わった場合もここに来る。npmの多段起動
    // (npm -> run.js -> server.js)でシグナルがちゃんと伝わらない環境が
    // あるため、下のprocess.on('SIGINT'...)で明示的に子へ転送もしている。
    process.exit(signal ? 0 : (code === null ? 0 : code));
  });
}

// Ctrl+C / 終了シグナルを、確実に子プロセス(server.js)へ転送してから
// 自分も終了する。これが無いと、二重起動(run.js経由)のせいで
// Ctrl+Cがserver.jsまで届かず終了できないことがある。
["SIGINT", "SIGTERM"].forEach((sig) => {
  process.on(sig, () => {
    if (child) child.kill(sig);
    else process.exit(0);
  });
});

start();
