.ONESHELL:
.PHONY: deploy

HASH := $(shell git rev-parse --short HEAD)

clean:
	rm -rf build



build-static:
	mkdir -p build
	cp -R static/* build/
	sed 's/\(\.js\|\.css\)/&?$(HASH)/' static/index.html > build/index.html

build-docs:
	NODE_ENV=production npm run docs

build-app:
	NODE_ENV=production npm run build

build: build-app build-static

deploy: clean build-static build-docs build-app
	scp -r build/* home:/websites/ryan.nz/v2/
