# 中研院「社會變遷全記錄」半自動化計畫

Hackpad/說明： https://g0v.hackpad.com/UssOWtAVda9

# Requirements
0. git
1. Docker 1.7+
2. Docker-compose 1.6+
3. node

# Features

## 第一步 - 簡易查詢界面

1. Deploy Grafana + Influx 
  1. `cd step1/dockers`
  2. `sudo docker-compose build`
  3. `sudo env GF_SECURITY_ADMIN_PASSWORD=<passwd> docker-compose -f docker-compose.yml -f prod.yml up -d`
  4. `./resetInflux.sh`
3. Setup parser 
  1. `cd parser`
  2. `npm install`
2. Insert Data
  1. `node parser/csv2influx.js data/sample.noheader.csv 100`
  2. To insert whole data set, use 1 instead of 100 for last arg
