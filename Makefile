run:
	fuser -k 3000/tcp || true
	bunx next dev --turbo