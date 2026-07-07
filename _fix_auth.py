import pathlib

p = pathlib.Path('src/routes/auth.js')
lines = p.read_text().splitlines(keepends=True)

bad_fragment = 'user.toPublic() }'
good_line    = '  return reply.send({  user.toPublic() });
'

for i, line in enumerate(lines):
    if bad_fragment in line and 'reply.send' in line and 'token' not in line:
        print(f'Fixing line {i+1}: {repr(line.rstrip())}')
        lines[i] = good_line
        print(f'         -> {repr(good_line.rstrip())}')

p.write_text(''.join(lines))
print('Done')
