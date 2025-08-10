#!/bin/bash
# Archivo: ejecutar_docker.sh

# Exportar DISPLAY para aplicaciones gráficas
export DISPLAY=${DISPLAY}

# Nombre del contenedor
CONTAINER_NAME="chromium-38-container"

# Función para detener el contenedor cuando se reciba Ctrl+C
cleanup() {
    echo "Deteniendo el contenedor $CONTAINER_NAME..."
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1
}

# Asegurar que cleanup se ejecute al recibir señales como SIGINT o SIGTERM
trap cleanup SIGINT SIGTERM


# Permitir acceso al servidor X11
xhost +local:docker

# Ejecutar el contenedor Docker
docker run --name "$CONTAINER_NAME" -e DISPLAY=$DISPLAY \
  -v /tmp/.X11-unix:/tmp/.X11-unix \
  -v "$(pwd)/user_data_38:/home/chromium/chromium_data" \
  --privileged --shm-size=3g -it chromium-38

cleanup
