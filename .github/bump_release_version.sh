#!/bin/bash

STR=$1

echo 'Parsed version is: '$1
numbers=${STR#*v}

arrIN=(${numbers//./ })

if [ $2 == 'patch' ]
then
  echo 'Major bumped version is: '${arrIN[0]}
  echo 'Minor bumped version is: '${arrIN[1]}
  echo 'Patch bumped version is: '$((${arrIN[2]}+1))

  echo "major=${arrIN[0]}" >> $GITHUB_OUTPUT
  echo "minor=${arrIN[1]}" >> $GITHUB_OUTPUT
  echo "patch=$((${arrIN[2]}+1))" >> $GITHUB_OUTPUT
elif [ $2 == 'minor' ]
then
  echo 'Major bumped version is: '${arrIN[0]}
  echo 'Minor bumped version is: '$((${arrIN[1]}+1))
  echo 'Patch bumped version is: '0

  echo "major=${arrIN[0]}" >> $GITHUB_OUTPUT
  echo "minor=$((${arrIN[1]}+1))" >> $GITHUB_OUTPUT
  echo "patch=0" >> $GITHUB_OUTPUT
elif [ $2 == 'major' ]
then
  echo 'Major bumped version is: '$((${arrIN[0]}+1))
  echo 'Minor bumped version is: '0
  echo 'Patch bumped version is: '0

  echo "major=$((${arrIN[0]}+1))" >> $GITHUB_OUTPUT
  echo "minor=0" >> $GITHUB_OUTPUT
  echo "patch=0" >> $GITHUB_OUTPUT
else
   echo 'Wrong parameters were pass in script, expected $1 is v1.2.3, $2 in [patch,minor,major], got: '$1' and '$2
fi
