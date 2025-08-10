# Base contemporánea a Chromium 68; bionic aún tiene repos en old-releases
FROM ubuntu:18.04

# Crear un usuario no privilegiado para ejecutar Chromium
RUN groupadd -g 1000 chromium && useradd -u 1000 -g chromium -m -d /home/chromium chromium

RUN mkdir -p /home/chromium/chromium_data

RUN chown chromium:chromium --recursive /home/chromium/chromium_data

# Evitar preguntas de tzdata, etc.
ENV DEBIAN_FRONTEND=noninteractive
ENV GTK_THEME=Adwaita-dark

# Actualizar los repositorios e instalar las dependencias mínimas necesarias para Chromium 68
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget \
    curl \
    gnupg \
    ca-certificates \
    libx11-6 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libasound2 \
    libnss3 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libgtk-3-0 \
    libxtst6 \
    xdg-utils \
    libxss1 \
    fonts-liberation \
    libappindicator3-1

# Copiar todos los archivos .deb desde el directorio local al contenedor
COPY *.deb /tmp/

# Instalar todos los paquetes .deb
RUN dpkg -i /tmp/*.deb || true && \
    apt-get install -y --fix-missing && \
    dpkg -i /tmp/*.deb && \
    apt-mark hold chromium-browser chromium-codecs-ffmpeg-extra

RUN rm /tmp/*.deb

# Limpiar el caché de apt para reducir el tamaño de la imagen
RUN apt-get clean && rm -rf /var/lib/apt/lists/*

# Configuración para permitir el acceso a la pantalla (X11 forwarding)
ENV DISPLAY=:0
RUN mkdir -p /home/chromium/.X11
VOLUME /tmp/.X11-unix

# Cambiar a un usuario no privilegiado para ejecutar Chromium
USER chromium

# Ejecutar Chromium con acceso a la pantalla
ENTRYPOINT ["chromium-browser", "--no-sandbox", "--disable-gpu", "--enable-logging=stderr", "--v=1", "--user-data-dir=/home/chromium/chromium_data"]
