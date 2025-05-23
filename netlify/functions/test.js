// Netlify function to serve a Firebase test page
exports.handler = async function(event, context) {
  const html = `<!DOCTYPE html>
<html>
<head>
    <title>Simple Firebase Test</title>
</head>
<body>
    <h1 style="text-align:center;">Firebase Test</h1>
    
    <button onclick="testFirebase()" style="display:block; margin:20px auto; padding:15px 30px; background-color:red; color:white; font-size:20px; border:none; cursor:pointer;">
        Test Firebase Connection
    </button>
    
    <div id="result" style="margin:20px auto; padding:20px; max-width:600px; border:1px solid #ccc; text-align:center;">
        Click the button to test
    </div>
    
    <script>
        function testFirebase() {
            document.getElementById('result').innerHTML = 'Testing...';
            
            fetch('https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.json?shallow=true')
                .then(response => {
                    if (response.ok) {
                        document.getElementById('result').innerHTML = 'SUCCESS: Firebase connection working! Status: ' + response.status;
                        document.getElementById('result').style.color = 'green';
                    } else {
                        document.getElementById('result').innerHTML = 'ERROR: Firebase returned status ' + response.status;
                        document.getElementById('result').style.color = 'red';
                    }
                })
                .catch(error => {
                    document.getElementById('result').innerHTML = 'ERROR: ' + error.message;
                    document.getElementById('result').style.color = 'red';
                });
        }
    </script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html',
    },
    body: html
  };
}; 