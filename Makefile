.ONESHELL:
.PHONY: deploy

deploy:
	rm -rf build
	NODE_ENV=production npm run docs
	NODE_ENV=production npm run build
	scp -r build/* home:/websites/ryan.nz/v2/
	scp -r static/* home:/websites/ryan.nz/v2/
