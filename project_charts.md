
```json
[
  {
    "id": 0,
    "boxid": 0,
    "name": "chart name",
    "type": "chart type: executor|validator|provider|analyst"
    "script": "script to run",
    "interpreter": "bash",
    "execution": {
      "type": "slurm",
      "cmd": "auto"
    },
    "input": ["in.lammps", "reax.AlO"],
    "output": [],
    "condition": {
      "exist": ["in.lammps"],
      "return": 0
    },
    "link": {"in": [-1], "out": [-1]}
  }
]
```

## executor

```json
{
    "id": 0,
    "boxid": 0,
    "name": "chart name",
    "links": {"in": [ "id", "..."], "out": ["id", "..."]},
    "type": "executor",
    "execution": {
        "type": "script",
        "script": "text"
        "cargs" "interpreter argument"
        "args": "script arguments"
    },
    "input": ["file list", "..."],
    "output": ["file list", "..."],
}
```

```json
{
    "id": 0,
    "boxid": 0,
    "name": "chart name",
    "links": {"in": [ "id", "..."], "out": ["id", "..."]},
    "type": "executor",
    "execution": {
        "type": "mpi",
        "path": "program file",
        "cargs": "mpi args",
        "args": "program args"
    },
    "input": ["file list", "..."],
    "output": ["file list", "..."],
}
```

```json
{
    "id": 0,
    "boxid": 0,
    "name": "chart name",
    "links": {"in": [ "id", "..."], "out": ["id", "..."]},
    "type": "executor",
    "execution": {
        "type": "queue",
        "script": "submit script",
        "path": "program path"
        "cargs": "batch arguments"
        "args": " arguments"
    },
    "input": ["file list", "..."],
    "output": ["file list", "..."],
}
```


## validator

```json
{
    "id": 0,
    "boxid": 0,
    "name" "chart name",
    "links": {"in": [ "id", "..."], "out": ["if_true: id", "if_false: id"]},
    "type": "validator",
    "execution": {
        "type": "filecheck",
        "script": "shell script"
        "validation": ["return", "true condition"]
    }        
}
```

## provider

```json
{
    "id": 0,
    "boxid": 0,
    "name" "chart name",
    "links": {"in": [ "id", "..."], "out": ["if_true: id", "if_false: id"]},
    "type": "provider",
    "execution": {
        "type": "upload",
        "filepath": ["file01", "..."]
    }
}
```

```json
{
    "id": 0,
    "boxid": 0,
    "name" "chart name",
    "links": {"in": [ "id", "..."], "out": ["if_true: id", "if_false: id"]},
    "type": "provider",
    "execution": {
        "type": "link",
        "filepath": ["link01", "..."]
    }
}
```


