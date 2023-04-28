.ONESHELL:
.PHONY: deploy

deploy:
	rm -rf build
	npm run build
	scp -r build/* home:/websites/ryan.nz/v2/
	scp -r static/* home:/websites/ryan.nz/v2/
