FROM php:8.2-apache

# Install ekstensi PHP yang dibutuhkan (curl sudah ada di base image php:8.2-apache,
# tapi kita pastikan dependency-nya tersedia untuk build environment)
RUN apt-get update && apt-get install -y --no-install-recommends \
        libcurl4-openssl-dev \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Aktifkan mod_rewrite & headers untuk .htaccess
RUN a2enmod rewrite headers

# Konfigurasi PHP: izinkan upload file JSON yang lebih besar
RUN { \
        echo "upload_max_filesize = 25M"; \
        echo "post_max_size = 25M"; \
        echo "memory_limit = 256M"; \
        echo "max_execution_time = 60"; \
    } > /usr/local/etc/php/conf.d/uploads.ini

# Izinkan .htaccess override
RUN sed -i 's|AllowOverride None|AllowOverride All|g' /etc/apache2/apache2.conf

# Render memberikan port melalui env variable PORT (default 10000)
# Sesuaikan Apache untuk listen di port tersebut
RUN sed -i 's/Listen 80/Listen ${PORT}/g' /etc/apache2/ports.conf \
    && sed -i 's/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/g' /etc/apache2/sites-available/000-default.conf

# Copy seluruh kode aplikasi ke document root
COPY . /var/www/html/

# Hapus file yang tidak perlu di production
RUN rm -f /var/www/html/Dockerfile /var/www/html/render.yaml /var/www/html/.env.example /var/www/html/PANDUAN.md /var/www/html/.gitignore

# Set kepemilikan
RUN chown -R www-data:www-data /var/www/html

ENV PORT=10000
EXPOSE 10000

CMD ["apache2-foreground"]
