FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# gunicorn --reload enables hot reload when source files change (dev use only)
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "1", "--reload", "run:app"]
