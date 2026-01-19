# Changelog

## [0.1.1](https://github.com/CedricLuccheseDev/Musaic/compare/v0.1.0...v0.1.1) (2026-01-19)


### Features

* add API security, improve drop detection, optimize waveforms ([7795f1a](https://github.com/CedricLuccheseDev/Musaic/commit/7795f1ae447e4626c440a468c4252497397b6f36))
* Add similar tracks feature and auto-batch analysis ([29a7f5a](https://github.com/CedricLuccheseDev/Musaic/commit/29a7f5ac18c3b79e3b3e1a89e9724153fc9f89e0))
* **analyzer:** improve beat grid detection with bass energy analysis ([1899431](https://github.com/CedricLuccheseDev/Musaic/commit/18994316e647ffea3904b25b381b2cf688544aca))
* cascade search, quality scoring, analyzer improvements ([fb83d4c](https://github.com/CedricLuccheseDev/Musaic/commit/fb83d4c90717b892f9cb2d3a312714b79ebf86ba))
* DJ Preview with dual decks, waveform sync and beat alignment ([373e4a5](https://github.com/CedricLuccheseDev/Musaic/commit/373e4a555ab0891d2f0f683d7d49289b544ecf74))
* migrate to release-please for automated versioning ([991521c](https://github.com/CedricLuccheseDev/Musaic/commit/991521c7604d8d6bed6bed9cacf59e0e9bc99fe0))
* **search:** AI chat-like search experience with smart suggestions ([95f3001](https://github.com/CedricLuccheseDev/Musaic/commit/95f3001fd4bc67a5c346d97f216e5895b28891ca))
* **web:** add track age display, download iframe, fix AI bugs ([fce7811](https://github.com/CedricLuccheseDev/Musaic/commit/fce7811a3e756100de881f6202ee1f63a112c3de))


### Bug Fixes

* add API key to analyzer utility functions ([31f09e2](https://github.com/CedricLuccheseDev/Musaic/commit/31f09e2b97a74b0e763623f3235a6e5f9845eeac))
* Add comments to empty catch blocks for ESLint ([c6d5c4f](https://github.com/CedricLuccheseDev/Musaic/commit/c6d5c4ff5c33bc169805e10516552aea77a51e2b))
* Add missing type exports and update CLAUDE.md ([45c59f9](https://github.com/CedricLuccheseDev/Musaic/commit/45c59f9d613890219b55dcd914b45fbb183f5694))
* add python-multipart dependency for FastAPI file uploads ([f213136](https://github.com/CedricLuccheseDev/Musaic/commit/f213136c6ce90fd3a14dba06dddf73d87d208611))
* **analyzer:** beat_offset save bug, add reanalysis endpoint, search by ID ([184936c](https://github.com/CedricLuccheseDev/Musaic/commit/184936c69eb6fa42e8de9ec76ad7cfa4b98b4e05))
* **app:** Auto-update version file on release ([a6d5d9a](https://github.com/CedricLuccheseDev/Musaic/commit/a6d5d9a1d968e7f6a9697433ccc993154f8b2cbe))
* Copy shared folder in Docker build ([cb56281](https://github.com/CedricLuccheseDev/Musaic/commit/cb56281e1da747f571a450afdddc68c4a3e3e1f5))
* Handle existing tags in release workflow ([4d1d314](https://github.com/CedricLuccheseDev/Musaic/commit/4d1d314ba230cf4061a42ef56052f053733f5a62))
* Push version commit to dev before merging to main ([9f8116d](https://github.com/CedricLuccheseDev/Musaic/commit/9f8116d74a2e7776677786499a65cc70d7767cac))
* Update imports in populateTracks.ts script ([fb7e60d](https://github.com/CedricLuccheseDev/Musaic/commit/fb7e60d43fde3f2c2dd477b1f31893d8fc79c4df))
* Update type imports to use ~/types ([b6c58b6](https://github.com/CedricLuccheseDev/Musaic/commit/b6c58b69f438e68157e5b2f05cb557ab3c2cf185))
* **web:** remove unused variables to fix lint errors ([bb47441](https://github.com/CedricLuccheseDev/Musaic/commit/bb47441cdda9a88db94b2021f2dc72e6818d0aef))


### Refactoring

* **shared:** Simplify types - keep manual approach ([b9d6b4b](https://github.com/CedricLuccheseDev/Musaic/commit/b9d6b4b462e8c6e6fbfc053f34464de49fb05786))
* **types:** Reorganize with Supabase as source of truth ([dfdd71f](https://github.com/CedricLuccheseDev/Musaic/commit/dfdd71fb8f1d98014f5a45f2811b115cba8a8066))
* **web:** simplify version to use package.json directly ([d56b4f2](https://github.com/CedricLuccheseDev/Musaic/commit/d56b4f27a6594ba834373561609485bfa0966714))
