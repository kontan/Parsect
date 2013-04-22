import Text.Parsec




p = satisfy (/= 'p')

r = parse p "" "piyo"

main = do
	print r
