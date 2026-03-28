from alpine

run apk update
run apk add openssh uv bash runuser
run akp add vim

run mkdir /opt/venv
workdir /opt/venv
run uv init
run uv add flask fabric

run adduser instruktur -s /bin/bash -D
run echo instruktur:h4rdT0bre4k | chpasswd

copy entry.sh /entry.sh
run chmod +x /entry.sh

cmd ["/entry.sh"]
