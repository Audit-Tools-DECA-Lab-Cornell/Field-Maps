#!/bin/sh
set -eu

data_dir=/var/lib/postgresql/fieldops
install -d -m 700 -o postgres -g postgres "$data_dir"
install -d -m 775 -o postgres -g postgres /var/run/postgresql
if [ ! -s "$data_dir/PG_VERSION" ]; then
  gosu postgres initdb --pgdata="$data_dir" --username=fieldops_owner \
    --auth-local=trust --auth-host=reject --encoding=UTF8 --locale=C.UTF-8
fi
exec gosu postgres postgres -D "$data_dir" \
  -c listen_addresses= -c unix_socket_directories=/var/run/postgresql
