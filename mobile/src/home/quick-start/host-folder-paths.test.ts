import { describe, expect, it } from 'vitest'
import {
  childFolderPath,
  isNotGitRepositoryError,
  listChildFolderNames,
  parentFolderPath
} from './host-folder-paths'

describe('listChildFolderNames', () => {
  it('keeps visible folders only, sorted by name regardless of case', () => {
    expect(
      listChildFolderNames([
        { name: 'zeta', isDirectory: true },
        { name: 'notes.txt', isDirectory: false },
        { name: '.git', isDirectory: true },
        { name: 'Alpha', isDirectory: true },
        { name: 'beta', isDirectory: true }
      ])
    ).toEqual(['Alpha', 'beta', 'zeta'])
  })

  it('gives nothing for an empty folder', () => {
    expect(listChildFolderNames([])).toEqual([])
  })
})

describe('childFolderPath', () => {
  it('joins with the host’s separator, without doubling it at a root', () => {
    expect(childFolderPath('/Users/me', 'games', 'posix')).toBe('/Users/me/games')
    expect(childFolderPath('/', 'Users', 'posix')).toBe('/Users')
    expect(childFolderPath('C:\\', 'Users', 'win32')).toBe('C:\\Users')
    expect(childFolderPath('C:\\Users', 'me', 'win32')).toBe('C:\\Users\\me')
  })
})

describe('parentFolderPath', () => {
  it('goes one folder up on a Mac or Linux host', () => {
    expect(parentFolderPath('/Users/me/games', 'posix')).toBe('/Users/me')
    expect(parentFolderPath('/Users/me/games/', 'posix')).toBe('/Users/me')
    expect(parentFolderPath('/Users', 'posix')).toBe('/')
  })

  it('stops at the top of the disk', () => {
    expect(parentFolderPath('/', 'posix')).toBeNull()
    expect(parentFolderPath('C:\\', 'win32')).toBeNull()
    expect(parentFolderPath('C:', 'win32')).toBeNull()
  })

  it('goes up on a Windows host, back to the drive root', () => {
    expect(parentFolderPath('C:\\Users\\me', 'win32')).toBe('C:\\Users')
    expect(parentFolderPath('C:\\Users', 'win32')).toBe('C:\\')
    expect(parentFolderPath('C:/Users/me/', 'win32')).toBe('C:\\Users')
  })
})

describe('isNotGitRepositoryError', () => {
  it('spots the host’s not-a-repository refusal only', () => {
    expect(isNotGitRepositoryError(new Error('Not a valid git repository: /Users/me/x'))).toBe(true)
    expect(isNotGitRepositoryError(new Error('Folder does not exist: /x'))).toBe(false)
    expect(isNotGitRepositoryError('Not a valid git repository')).toBe(false)
  })
})
