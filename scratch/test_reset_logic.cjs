// Mock unit test for reset-password route logic
const assert = require('assert');

// 1. Mock supabase client dependencies
const mockSupabase = {
  profileData: null,
  from(table) {
    if (table === 'profiles') {
      return {
        select(cols) {
          return {
            eq(col, val) {
              return {
                async maybeSingle() {
                  return { data: mockSupabase.profileData, error: null };
                }
              };
            }
          };
        }
      };
    }
    return null;
  }
};

// 2. Define the route handler logic to test (extracted directly from routes/employees.js)
async function testHandler(req, res, supabaseClient) {
  try {
    const { id } = req.params;
    
    // Safety check: Only shastikaglobal11@gmail.com or users with the 'admin' or 'manager' role are authorized
    let isAuthorized = req.user.email === 'shastikaglobal11@gmail.com';
    if (!isAuthorized) {
      const { data: requesterProfile } = await supabaseClient
        .from('profiles')
        .select('role, email')
        .eq('id', req.user.sub || req.user.id)
        .maybeSingle();
      
      isAuthorized = requesterProfile && (
        requesterProfile.email === 'shastikaglobal11@gmail.com' ||
        requesterProfile.role === 'admin' ||
        requesterProfile.role === 'manager'
      );
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: 'Unauthorized: Only administrators are authorized to trigger password resets.' });
    }

    // If passed, return success
    return res.status(200).json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

// 3. Helper to create mock response object
function createMockRes() {
  const res = {
    statusCode: 200,
    jsonPayload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonPayload = data;
      return this;
    }
  };
  return res;
}

// 4. Run test cases
async function runTests() {
  console.log('--- RUNNING RESET PASSWORD AUTHORIZATION UNIT TESTS ---');

  // Case 1: Requester is shastikaglobal11@gmail.com
  {
    const req = {
      params: { id: 'target-emp-id' },
      user: { id: 'user-id-1', email: 'shastikaglobal11@gmail.com', sub: 'user-id-1' }
    };
    const res = createMockRes();
    mockSupabase.profileData = null; // Should not even query DB
    await testHandler(req, res, mockSupabase);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.jsonPayload, { success: true });
    console.log('✅ Case 1 Passed: shastikaglobal11@gmail.com is authorized immediately.');
  }

  // Case 2: Requester is an admin (e.g. ramragul)
  {
    const req = {
      params: { id: 'target-emp-id' },
      user: { id: 'user-id-2', email: 'ramragul@shastikaglobalimpex.co.in', sub: 'user-id-2' }
    };
    const res = createMockRes();
    mockSupabase.profileData = { email: 'ramragul@shastikaglobalimpex.co.in', role: 'admin' };
    await testHandler(req, res, mockSupabase);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.jsonPayload, { success: true });
    console.log('✅ Case 2 Passed: Other admin (e.g. ramragul) is authorized via profile check.');
  }

  // Case 3: Requester is a manager
  {
    const req = {
      params: { id: 'target-emp-id' },
      user: { id: 'user-id-3', email: 'manager@shastikaglobalimpex.co.in', sub: 'user-id-3' }
    };
    const res = createMockRes();
    mockSupabase.profileData = { email: 'manager@shastikaglobalimpex.co.in', role: 'manager' };
    await testHandler(req, res, mockSupabase);
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(res.jsonPayload, { success: true });
    console.log('✅ Case 3 Passed: Manager is authorized via profile check.');
  }

  // Case 4: Requester is a regular BDE (should be rejected)
  {
    const req = {
      params: { id: 'target-emp-id' },
      user: { id: 'user-id-4', email: 'bde@shastikaglobalimpex.co.in', sub: 'user-id-4' }
    };
    const res = createMockRes();
    mockSupabase.profileData = { email: 'bde@shastikaglobalimpex.co.in', role: 'bde' };
    await testHandler(req, res, mockSupabase);
    assert.strictEqual(res.statusCode, 403);
    assert.ok(res.jsonPayload.error.includes('Unauthorized'));
    console.log('✅ Case 4 Passed: Regular employee role (bde) is rejected.');
  }

  console.log('🎉 ALL UNIT TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
