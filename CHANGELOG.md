# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2024-11-19

### Added
- **Extended Type System**: Automatic integer optimization (i8, i16, i32, i64)
- **Float Types**: Support for f32 and f64
- **Date Types**: Automatic detection of date and datetime strings
- **Real Tokenizer**: Integration with js-tiktoken for accurate GPT-4 token counting
- **Schema Validation**: Now validates schema across ALL objects, not just first
- **Error System**: Custom error classes with detailed context
- **5 New Tests**: Tokenizer integration tests

### Changed
- **Type Detection**: Numbers now automatically use smallest fitting type
- **Token Statistics**: Now shows real token counts instead of estimation
- **CLI**: Improved output formatting and error messages

### Fixed
- **Round-trip Conversion**: Numbers no longer converted to strings
- **Schema Detection**: Missing keys in later objects now properly detected
- **String Escaping**: Proper handling of quotes, newlines, tabs
- **Commander.js**: Fixed options parsing in v12

### Performance
- **33.9% token savings** on test data (verified with GPT-4 tokenizer)
- Scales to **50%+ savings** with 100+ items

## [0.1.0] - 2024-11-18

### Added
- Initial release
- JSON ↔ TONL conversion
- YAML ↔ TONL conversion
- CLI tool with `-s` stats flag
- Basic type detection (string, number, boolean, null)
- 39 unit tests

[0.2.0]: https://github.com/kryptomrx/tonl-mcp-bridge/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/kryptomrx/tonl-mcp-bridge/releases/tag/v0.1.0