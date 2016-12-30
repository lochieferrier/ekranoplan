def updateOpenVSP(inputDict):
    print 'a tiger!'
    filename = 'design.des'
    with open(filename,'r+') as f:
        result = f.read()
        a = result.split('\n')
        outputLines = []
        for line in a:
            words = line.split(':')
            if len(words) > 1:
                key = words[0]
                value = float(words[-1])
                if key in inputDict:
                    value = " " + str(inputDict[key])
                words[-1] = value
            outputLine = ":".join(words)
            outputLines += [outputLine]
        output = '\n'.join(outputLines)
        print('OpenVSP .des output:')
        print(output)
        f.seek(0)
        f.write(output)
        f.truncate()
        f.close()