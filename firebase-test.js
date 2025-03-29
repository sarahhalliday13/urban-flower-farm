// Firebase direct testing script
// Add this to your page to test Firebase connectivity directly

(function() {
  console.log("Firebase test script running");
  
  // Force Firebase configuration
  const firebaseConfig = {
    apiKey: "AIzaSyC_RP2Pw3rA9Nr9zRNzNx1t252lD3zCGuA",
    databaseURL: "https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com",
    authDomain: "buttonsflowerfarm-8a54d.firebaseapp.com",
    projectId: "buttonsflowerfarm-8a54d",
    storageBucket: "buttonsflowerfarm-8a54d.firebasestorage.app",
    messagingSenderId: "862699200436",
    appId: "1:862699200436:web:64b40c67ec932fb8401ce1"
  };
  
  // Test direct HTTP access to Firebase
  console.log("Testing direct HTTP access to Firebase");
  fetch("https://buttonsflowerfarm-8a54d-default-rtdb.firebaseio.com/.json?shallow=true")
    .then(response => {
      console.log("Firebase HTTP response status:", response.status);
      return response.json();
    })
    .then(data => {
      console.log("Firebase data via direct HTTP:", data);
    })
    .catch(error => {
      console.error("Firebase direct HTTP error:", error);
    });
    
  // Add direct script loading test
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  
  // Test loading Firebase scripts
  Promise.all([
    loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js'),
    loadScript('https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js')
  ])
  .then(() => {
    console.log("Firebase scripts loaded directly");
    
    // Initialize Firebase directly
    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(firebaseConfig);
      console.log("Firebase initialized directly");
      
      // Test database read
      const dbRef = window.firebase.database().ref();
      dbRef.child('plants').limitToFirst(1).get()
        .then((snapshot) => {
          if (snapshot.exists()) {
            console.log("Firebase direct read successful:", snapshot.val());
          } else {
            console.log("No data available from direct Firebase read");
          }
        })
        .catch((error) => {
          console.error("Firebase direct read error:", error);
        });
    }
  })
  .catch(error => {
    console.error("Error loading Firebase scripts directly:", error);
  });
  
  console.log("Firebase test script completed");
})(); 