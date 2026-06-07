#!/usr/bin/env bash
# Entrypoint del contenedor en RunPod: inyecta la clave pública (RunPod la pasa en $PUBLIC_KEY),
# arranca sshd (para SSH directo + scp por "exposed TCP") y mantiene el contenedor vivo.
set -e
mkdir -p /root/.ssh && chmod 700 /root/.ssh
if [ -n "$PUBLIC_KEY" ]; then
  echo "$PUBLIC_KEY" >> /root/.ssh/authorized_keys
  chmod 600 /root/.ssh/authorized_keys
fi
mkdir -p /run/sshd
# Generar host keys si faltan y arrancar sshd en segundo plano
ssh-keygen -A >/dev/null 2>&1 || true
/usr/sbin/sshd
exec sleep infinity
