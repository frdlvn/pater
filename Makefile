# Basic Makefile for Pater

.PHONY: install dev start test build build-win clean

install:
	npm install

echo-env:
	@echo Node: `node -v`; echo NPM: `npm -v`

dev:
	npm run dev

start:
	npm start

test:
	npm test

build:
	npm run build

build-win:
	npm run build:win

clean:
	rm -rf dist node_modules .vite coverage
