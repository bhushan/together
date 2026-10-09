"""Regenerate src/lib/airports.json from OurAirports (public domain): python3 scripts/airports.py

Keeps airports with scheduled passenger service and an IATA code, largest first so a
city-name suggestion picks the main airport.
"""
import csv, io, json, urllib.request

source = 'https://davidmegginson.github.io/ourairports-data/airports.csv'
rows = csv.DictReader(io.StringIO(urllib.request.urlopen(source).read().decode('utf-8')))
rank = {'large_airport': 0, 'medium_airport': 1, 'small_airport': 2}
airports = sorted(
    (rank.get(row['type'], 3), row['iata_code'], row['municipality'] or row['name'])
    for row in rows
    if row['scheduled_service'] == 'yes' and len(row['iata_code']) == 3 and row['iata_code'].isalpha() and row['iata_code'].isupper()
)
codes = {}
for _, code, city in airports: codes.setdefault(code, city.split(' (')[0])
with open('src/lib/airports.json', 'w') as file: json.dump(codes, file, ensure_ascii=False, separators=(',', ':'))
print(len(codes), 'airports')
