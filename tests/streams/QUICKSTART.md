# Quick Start: Running Streaming Tests

## ✅ Zero Setup Required!

**Good news:** All test dependencies are already installed! No `npm install` needed.

This project uses **Vitest** (already in `package.json`), so you can run tests immediately.

---

## 🚀 Run Tests Now

```bash
# Run all streaming tests
npm test tests/streams/

# Expected output:
# ✓ tests/streams/ndjson-parse.test.ts (50+)
# ✓ tests/streams/tonl-transform.test.ts (40+)
# ✓ tests/streams/pipeline-integration.test.ts (30+)
# ✓ tests/streams/http-endpoint.test.ts (25+)
```

---

## 📊 Common Commands

```bash
# Watch mode (auto-rerun on file changes)
npm test -- --ui

# Coverage report
npm test -- --coverage

# Run specific test file
npm test tests/streams/ndjson-parse.test.ts

# Run tests matching pattern
npm test tests/streams/ -- -t "chunk boundary"
```

---

## 🐛 Troubleshooting

### Tests failing with "Cannot find module"?

```bash
# Rebuild TypeScript
npm run build
```

### Server tests failing?

```bash
# Kill any process on port 3000
lsof -ti:3000 | xargs kill -9

# Then run tests
npm test tests/streams/http-endpoint.test.ts
```

### Out of memory errors?

```bash
# Increase Node memory
NODE_OPTIONS="--max-old-space-size=4096" npm test
```

---

## 📝 Test Structure

```
tests/streams/
├── ndjson-parse.test.ts       # 50+ tests (NDJSON parser)
├── tonl-transform.test.ts     # 40+ tests (TONL transformer)
├── pipeline-integration.test.ts # 30+ tests (full pipeline)
├── http-endpoint.test.ts      # 25+ tests (HTTP endpoint)
├── README.md                  # Detailed documentation
└── TEST_SUMMARY.md            # What we tested and why
```

---

## 🎯 What Gets Tested?

- ✅ Chunk boundary handling (JSON split across network packets)
- ✅ Invalid JSON mixed with valid (production logs)
- ✅ DOS protection (huge lines)
- ✅ Unicode preservation (emojis, Chinese, Arabic)
- ✅ Type mismatches and schema drift
- ✅ Memory leaks with large streams
- ✅ Concurrent requests
- ✅ HTTP transport edge cases

---

## 🔥 Quick Verification

Want to verify everything works? Run this:

```bash
npm test tests/streams/ndjson-parse.test.ts

# Should see:
# ✓ Chunk Boundary Handling (3 tests)
# ✓ Invalid JSON Handling (4 tests)
# ✓ Whitespace and Empty Lines (3 tests)
# ✓ DOS Protection (3 tests)
# ... 50+ tests total
```

---

## 💡 Pro Tips

**Fastest test run:**
```bash
npm test tests/streams/ -- --reporter=dot
```

**Detailed output:**
```bash
npm test tests/streams/ -- --reporter=verbose
```

**Debug specific test:**
```bash
npm test tests/streams/ -- -t "should handle incomplete JSON"
```

**Watch mode with filter:**
```bash
npm test tests/streams/ndjson-parse.test.ts -- --ui
```

---

## ❓ FAQ

**Q: Do I need to install Jest?**  
A: No! We use Vitest which is already installed.

**Q: Why do some tests take 30s?**  
A: HTTP tests start a real server. It's normal.

**Q: Can I run tests in parallel?**  
A: Yes! Vitest does this automatically.

**Q: How do I see which tests are slow?**  
A: `npm test -- --reporter=verbose`

---

## 🎓 Next Steps

1. ✅ Run tests: `npm test tests/streams/`
2. ✅ Check coverage: `npm test -- --coverage`
3. ✅ Read detailed docs: `tests/streams/README.md`
4. ✅ Understand edge cases: `tests/streams/TEST_SUMMARY.md`

---

**Happy Testing!** 🧪
