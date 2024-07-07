var elasticsearch = require("elasticsearch");

var client = new elasticsearch.Client({
  hosts: ["http://elastic:123123123q@127.0.0.1:9200/"],
});

module.exports = client;

// curl -u elastic:$ELASTIC_PASSWORD -X POST "localhost:9200/_security/user/kibana_user" -H "Content-Type: application/json" -d'
// {
//   "password" : "kibana_password",
//   "roles" : [ "kibana_system", "ingest_admin" ],
//   "full_name" : "Kibana User",
//   "email" : "kibana_user@example.com"
// }
// '

// docker run -p 127.0.0.1:5601:5601 -d --name kibana --network elastic-net \
//   -e ELASTICSEARCH_HOSTS=http://elasticsearch:9200 \
//   -e ELASTICSEARCH_USERNAME=kibana_user \
//   -e ELASTICSEARCH_PASSWORD=kibana_password \
//   docker.elastic.co/kibana/kibana:8.14.1
