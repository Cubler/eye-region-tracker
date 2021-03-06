import sys


def main():
    output1 = open(sys.argv[1])
    output2 = open(sys.argv[2])

    coords1 = output1.readline()
    coords2 = output2.readline()
    
    diffFile = open('diffOutput.txt', 'w+')

    while(coords1 != ""):
        (x1,y1) = getXY(coords1)
        (x2,y2) = getXY(coords2)
        diffFile.write("[%0.2f, %0.2f]\n" % (x1-x2, y1-y2))
        coords1 = output1.readline()
        coords2 = output2.readline()

    diffFile.close()

def getXY(coordString):
    (x,y) = coordString.replace('[','').replace(']','').replace(',','').replace('\n','').split(' ')

    return (float(x), float(y))

main()
    


