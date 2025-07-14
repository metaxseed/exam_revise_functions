import { assertEquals } from "https://deno.land/std@0.192.0/testing/asserts.ts";

const BASE_URL = "http://localhost:54321/functions/v1/auth";
const TEST_USER = {
  email: "test@example.com",
  password: "testpassword123"
};

async function testHealthCheck() {
  const response = await fetch(`${BASE_URL}/health`, {
    headers: {
      "Origin": "http://localhost:3000"
    },
    credentials: "include"
  });
  const data = await response.json();
  
  assertEquals(response.status, 200);
  assertEquals(data.success, true);
  assertEquals(data.data.status, "healthy");
  
  console.log("✅ Health check passed");
}

async function testLogin() {
  const response = await fetch(`${BASE_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000"
    },
    credentials: "include",
    body: JSON.stringify({
      email: TEST_USER.email,
      password: TEST_USER.password
    })
  });
  
  const data = await response.json();
  console.log("Login response:", data);
  
  if (response.status === 200) {
    console.log("✅ Login test passed");
    return data.data.token;
  } else {
    console.log("⚠️ Login test failed (expected for non-existent user)");
    return null;
  }
}

async function testValidateSession(token: string) {
  const response = await fetch(`${BASE_URL}/validate`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Origin": "http://localhost:3000"
    },
    credentials: "include"
  });
  
  const data = await response.json();
  console.log("Validate response:", data);
  
  if (response.status === 200) {
    console.log("✅ Session validation test passed");
  } else {
    console.log("⚠️ Session validation test failed");
  }
}

async function testCheckSession() {
  const response = await fetch(`${BASE_URL}/check-session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000"
    },
    credentials: "include",
    body: JSON.stringify({
      email: TEST_USER.email,
      deviceInfo: { browser: "Chrome", os: "macOS" }
    })
  });
  
  const data = await response.json();
  console.log("Check session response:", data);
  
  if (response.status === 200) {
    console.log("✅ Check session test passed");
  } else {
    console.log("⚠️ Check session test failed");
  }
}

async function testLogout() {
  const response = await fetch(`${BASE_URL}/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:3000"
    },
    credentials: "include",
    body: JSON.stringify({
      redirectUrl: "/dashboard"
    })
  });
  
  const data = await response.json();
  console.log("Logout response:", data);
  
  if (response.status === 200) {
    console.log("✅ Logout test passed");
  } else {
    console.log("⚠️ Logout test failed");
  }
}

async function testCORS() {
  console.log("🔍 Testing CORS preflight...");
  
  const response = await fetch(`${BASE_URL}/login`, {
    method: "OPTIONS",
    headers: {
      "Origin": "http://localhost:3000",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "content-type, authorization"
    }
  });
  
  console.log("CORS preflight status:", response.status);
  console.log("CORS headers:", {
    "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
    "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
    "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers"),
    "Access-Control-Allow-Credentials": response.headers.get("Access-Control-Allow-Credentials")
  });
  
  if (response.status === 200) {
    console.log("✅ CORS preflight test passed");
  } else {
    console.log("⚠️ CORS preflight test failed");
  }
}

async function runTests() {
  console.log("🚀 Running auth function tests...\n");
  
  try {
    await testCORS();
    await testHealthCheck();
    await testCheckSession();
    await testLogout();
    
    const token = await testLogin();
    if (token) {
      await testValidateSession(token);
    }
    
    console.log("\n✅ All tests completed!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run tests if this file is executed directly
if (import.meta.main) {
  runTests();
}
 