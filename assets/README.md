# FieldMaps assets staging

This folder is the future in-repo asset library. Only screenshot staging and its capture manifests are generated in phase 1.

- `screenshots/web/raw/<Playwright project>/<day|dusk>/<role>/<route>/<state>/NN.png`
- `screenshots/mobile/raw/<ios|android>/<iphone|ipad|phone|tablet>/<day|dusk>/NN-*.png`

Raw captures are gitignored until the curated asset workflow is designed. Do **not** remove the ignore rules before configuring Git LFS; otherwise large binaries can enter ordinary Git history.

Later phase (not implemented): review/curation; `.gitattributes` LFS policy; content-hash asset index; Cloudinary signed upload and named `fieldmaps/` public IDs; responsive delivery transformations; Play/App Store exports and framed mockups. Keep originals immutable, re-encode derivatives only, avoid AI enhancements that change research data, labels, maps, or UI content.
